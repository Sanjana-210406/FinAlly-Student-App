package com.studentfinance.service;

import com.studentfinance.dto.*;
import com.studentfinance.model.*;
import com.studentfinance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private static final BigDecimal ANOMALY_MULTIPLIER = new BigDecimal("2.5");

    private final ExpenseRepository              expenseRepo;
    private final BudgetRepository               budgetRepo;
    private final ExpenseCategoryRepository      categoryRepo;
    private final MerchantLearnedMappingRepository mappingRepo;
    private final AlertService                   alertService;
    private final HealthScoreService             healthScoreService;
    private final SubscriptionService            subscriptionService;
    private final GamificationService            gamificationService;
    private final BehavioralPatternRepository    patternRepo;
    private final BudgetService                  budgetService;

    @Transactional
    public ExpenseResponse addExpense(User user, ExpenseRequest req) {
        // 1. Find or create budget for the expense date
        int month = req.getDate().getMonthValue();
        int year = req.getDate().getYear();
        Budget budget = budgetRepo.findByUserIdAndMonthAndYear(user.getId(), month, year)
            .orElseGet(() -> budgetService.generateBudget(user, month, year));

        // 2. Duplicate detection via fingerprint
        String fingerprint = generateFingerprint(user.getId(), req.getDate(), req.getAmount(), req.getDescription());
        boolean isDuplicate = expenseRepo.existsByUserIdAndFingerprint(user.getId(), fingerprint);
        if (isDuplicate) {
            throw new RuntimeException("Duplicate expense detected.");
        }

        // 3. Classify expense (3-layer)
        ClassificationResult classification = classifyExpense(user.getId(), req.getDescription(), req.getAmount(), req.getCategoryId());

        // 4. Anomaly detection — is this 2.5× the 30-day average for this category?
        boolean isAnomaly = detectAnomaly(user.getId(), classification.categoryId, req.getAmount());
        if (isAnomaly) {
            alertService.createAlert(user, Alert.AlertType.ANOMALY,
                "This expense (₹" + req.getAmount() + ") is much higher than your usual " + classification.categoryName + " spend.", null);
        }

        // 5. Emotional spend detection
        boolean isEmotional = req.getEmotionalSpend() != null && req.getEmotionalSpend();
        if (!isEmotional) {
            isEmotional = detectEmotionalSpend(user.getId());
        }

        // 6. Subscription detection hint
        boolean isSub = isSubscriptionKeyword(req.getDescription());

        // 7. Save expense
        ExpenseCategory category = categoryRepo.findById(classification.categoryId)
            .orElseThrow(() -> new RuntimeException("Category not found."));

        Expense expense = Expense.builder()
            .user(user)
            .budget(budget)
            .category(category)
            .amount(req.getAmount())
            .description(req.getDescription())
            .date(req.getDate())
            .fingerprint(fingerprint)
            .isAnomaly(isAnomaly)
            .isSubscription(isSub)
            .isEmotionalSpend(isEmotional)
            .userCorrectedCategory(req.getCategoryId() != null)
            .build();

        expense = expenseRepo.save(expense);

        // 8. Budget overspending alerts
        checkBudgetAlerts(user, budget, category);

        // 9. Auto-detect subscription if keyword matched
        if (isSub) {
            subscriptionService.detectAndUpsert(user, req.getDescription(), req.getAmount(), req.getDate());
        }

        // 10. Recalculate health score
        healthScoreService.recalculate(user);

        // 11. Gamification and Behavioral Patterns
        gamificationService.incrementStreak(user, Gamification.StreakType.LOGGING);
        checkBehavioralPatterns(user, isAnomaly, isEmotional, isSub);

        return toResponse(expense, isDuplicate, classification.confidence);
    }

    @Transactional
    public BulkExpenseResponse bulkAdd(User user, List<ExpenseRequest> reqs) {
        List<ExpenseResponse> saved = new ArrayList<>();
        int duplicates = 0;
        for (ExpenseRequest req : reqs) {
            try {
                saved.add(addExpense(user, req));
            } catch (RuntimeException e) {
                String msg = e.getMessage() != null ? e.getMessage() : "";
                if (msg.toLowerCase().contains("duplicate")) {
                    duplicates++;
                } else {
                    System.err.println("Skipped line in bulk upload: " + msg);
                }
            }
        }
        return BulkExpenseResponse.builder()
                .saved(saved)
                .duplicatesSkipped(duplicates)
                .totalSubmitted(reqs.size())
                .build();
    }

    @Transactional(readOnly = true)
    public List<LocalDate> getLoggedDates(Long userId) {
        return expenseRepo.findDistinctDatesByUserId(userId);
    }

    @Transactional(readOnly = true)
    public List<ExpenseResponse> getExpenses(Long userId) {
        return expenseRepo.findByUserIdOrderByDateDescCreatedAtDesc(userId)
            .stream().map(e -> toResponse(e, false, "STORED")).collect(Collectors.toList());
    }

    @Transactional
    public ExpenseResponse overrideCategory(User user, Long expenseId, Long categoryId) {
        Expense expense = expenseRepo.findById(expenseId)
            .orElseThrow(() -> new RuntimeException("Expense not found."));
        if (!expense.getUser().getId().equals(user.getId()))
            throw new RuntimeException("Access denied.");

        ExpenseCategory newCat = categoryRepo.findById(categoryId)
            .orElseThrow(() -> new RuntimeException("Category not found."));

        // Save merchant learning
        String normalized = expense.getDescription().toLowerCase().trim();
        mappingRepo.findByUserIdAndMerchantName(user.getId(), normalized).ifPresentOrElse(
            m -> { m.setCategory(newCat); m.setTimesUsed(m.getTimesUsed() + 1); mappingRepo.save(m); },
            () -> mappingRepo.save(MerchantLearnedMapping.builder()
                .user(user).merchantName(normalized).category(newCat).timesUsed(1).build())
        );

        expense.setCategory(newCat);
        expense.setUserCorrectedCategory(true);
        return toResponse(expenseRepo.save(expense), false, "USER_OVERRIDE");
    }

    @Transactional
    public void deleteExpense(User user, Long expenseId) {
        Expense expense = expenseRepo.findById(expenseId)
            .orElseThrow(() -> new RuntimeException("Expense not found."));
        if (!expense.getUser().getId().equals(user.getId()))
            throw new RuntimeException("Access denied.");
        expenseRepo.delete(expense);
        healthScoreService.recalculate(user);
    }

    // ── Private helpers ────────────────────────────────────────

    private String generateFingerprint(Long userId, LocalDate date, BigDecimal amount, String description) {
        try {
            String raw = userId + "|" + date + "|" + amount.setScale(2, RoundingMode.HALF_UP) + "|" + description.toLowerCase().trim();
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.substring(0, 64);
        } catch (Exception e) {
            return UUID.randomUUID().toString().replace("-", "");
        }
    }

    private record ClassificationResult(Long categoryId, String categoryName, String confidence) {}

    private ClassificationResult classifyExpense(Long userId, String description, BigDecimal amount, Long overrideCategoryId) {
        // If user explicitly picked a category
        if (overrideCategoryId != null) {
            return categoryRepo.findById(overrideCategoryId)
                .map(c -> new ClassificationResult(c.getId(), c.getName(), "USER_OVERRIDE"))
                .orElseGet(() -> defaultCategory());
        }

        String desc = description.toLowerCase().trim();

        // Layer 0: check learned merchant mappings first
        var learned = mappingRepo.findByUserIdAndMerchantName(userId, desc);
        if (learned.isPresent()) {
            var cat = learned.get().getCategory();
            return new ClassificationResult(cat.getId(), cat.getName(), "LEARNED");
        }

        // Layer 1: keyword matching (hardcoded for performance)
        Map<String, String> keywords = getKeywordMap();
        for (Map.Entry<String, String> entry : keywords.entrySet()) {
            if (desc.contains(entry.getKey())) {
                var cat = categoryRepo.findByName(entry.getValue());
                if (cat.isPresent()) return new ClassificationResult(cat.get().getId(), cat.get().getName(), "HIGH");
            }
        }

        // Layer 2: Default fallback (No more aggressive guessing based on amount)
        return defaultCategory();
    }

    private ClassificationResult findByName(String name, String confidence) {
        return categoryRepo.findByName(name)
            .map(c -> new ClassificationResult(c.getId(), c.getName(), confidence))
            .orElseGet(this::defaultCategory);
    }

    private ClassificationResult defaultCategory() {
        return categoryRepo.findByName("Other")
            .map(c -> new ClassificationResult(c.getId(), c.getName(), "LOW"))
            .orElseThrow(() -> new RuntimeException("Default category 'Other' missing from DB."));
    }

    private boolean detectAnomaly(Long userId, Long categoryId, BigDecimal amount) {
        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);
        BigDecimal avg = expenseRepo.avgByCategoryAndDateAfter(userId, categoryId, thirtyDaysAgo);
        if (avg == null || avg.compareTo(BigDecimal.ZERO) == 0) return false;
        return amount.compareTo(avg.multiply(ANOMALY_MULTIPLIER)) > 0;
    }

    private boolean detectEmotionalSpend(Long userId) {
        LocalDateTime ninetyMinsAgo = LocalDateTime.now().minusMinutes(90);
        long recentCount = expenseRepo.countRecentByUserId(userId, ninetyMinsAgo);
        return recentCount >= 3;
    }

    private boolean isSubscriptionKeyword(String description) {
        String desc = description.toLowerCase();
        List<String> subKeywords = List.of("netflix","spotify","hotstar","prime","disney","youtube premium",
            "discord nitro","notion","canva","adobe","gym","coursera","udemy","apple");
        return subKeywords.stream().anyMatch(desc::contains);
    }

    private void checkBudgetAlerts(User user, Budget budget, ExpenseCategory category) {
        // Check category % used — alert at 70% (Student threshold) and 100%
        var catSpent = expenseRepo.sumByCategoryAndBudget(user.getId(), budget.getId(), category.getId());
        // (full budget allocation logic would reference BudgetService.buildCategoryAllocations)
        // Simplified: total wants check
        var totalSpent = expenseRepo.sumByBudget(user.getId(), budget.getId());
        BigDecimal totalBudget = budget.getNeedsAllocation().add(budget.getWantsAllocation());
        if (totalSpent != null && totalBudget.compareTo(BigDecimal.ZERO) > 0) {
            double pct = totalSpent.divide(totalBudget, 4, RoundingMode.HALF_UP).doubleValue() * 100;
            if (pct >= 100) {
                alertService.createAlert(user, Alert.AlertType.DANGER,
                    "You've used 100% of your spendable budget this month!", category);
            } else if (pct >= 70) {
                alertService.createAlert(user, Alert.AlertType.WARNING,
                    String.format("You've spent %.0f%% of your monthly budget. Watch your spending!", pct), category);
            }
        }
    }

    private void checkBehavioralPatterns(User user, boolean isAnomaly, boolean isEmotional, boolean isSub) {
        if (isAnomaly) {
            patternRepo.save(BehavioralPattern.builder()
                .user(user)
                .patternType(BehavioralPattern.PatternType.IMPULSE_CLUSTER)
                .description("Detected an anomalous spend pattern.")
                .isActive(true)
                .build());
        }
        if (isEmotional) {
            patternRepo.save(BehavioralPattern.builder()
                .user(user)
                .patternType(BehavioralPattern.PatternType.MERCHANT_HABIT)
                .description("Detected an emotional spend pattern.")
                .isActive(true)
                .build());
        }
    }

    private Map<String, String> getKeywordMap() {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("zomato","Food & Dining"); m.put("swiggy","Food & Dining"); m.put("restaurant","Food & Dining");
        m.put("cafe","Food & Dining");   m.put("lunch","Food & Dining");  m.put("dinner","Food & Dining");
        m.put("breakfast","Food & Dining"); m.put("chai","Food & Dining"); m.put("pizza","Food & Dining");
        m.put("rent","Housing");  m.put("pg","Housing");   m.put("hostel","Housing");
        m.put("electricity","Utilities"); m.put("wifi","Utilities"); m.put("broadband","Utilities");
        m.put("metro","Transport"); m.put("uber","Transport"); m.put("ola","Transport"); m.put("rapido","Transport");
        m.put("petrol","Transport"); m.put("bus","Transport");
        m.put("medicine","Medical"); m.put("hospital","Medical"); m.put("pharmacy","Medical");
        m.put("netflix","Entertainment"); m.put("spotify","Entertainment"); m.put("hotstar","Entertainment");
        m.put("prime video","Entertainment"); m.put("disney","Entertainment");
        m.put("amazon","Shopping"); m.put("flipkart","Shopping"); m.put("myntra","Shopping");
        m.put("meesho","Shopping"); m.put("clothing","Shopping");
        m.put("sip","Investment"); m.put("mutual fund","Investment"); m.put("ppf","Investment");
        m.put("book","Education"); m.put("course","Education"); m.put("udemy","Education");
        m.put("fees","Education"); m.put("college","Education"); m.put("stationery","Education");
        m.put("emi","Loan Repayment"); m.put("loan","Loan Repayment");
        m.put("grocery","Grocery"); m.put("dmart","Grocery"); m.put("bigbasket","Grocery");
        m.put("blinkit","Grocery"); m.put("zepto","Grocery");
        return m;
    }

    private ExpenseResponse toResponse(Expense e, boolean isDuplicate, String confidence) {
        return ExpenseResponse.builder()
            .id(e.getId())
            .amount(e.getAmount())
            .description(e.getDescription())
            .date(e.getDate())
            .categoryName(e.getCategory().getName())
            .categoryType(e.getCategory().getType().name())
            .categoryIcon(e.getCategory().getIconCode())
            .isAnomaly(e.getIsAnomaly())
            .isSubscription(e.getIsSubscription())
            .isEmotionalSpend(e.getIsEmotionalSpend())
            .isDuplicate(isDuplicate)
            .classificationConfidence(confidence)
            .createdAt(e.getCreatedAt())
            .build();
    }
}