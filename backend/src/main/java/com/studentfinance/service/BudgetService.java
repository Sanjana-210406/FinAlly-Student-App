package com.studentfinance.service;

import com.studentfinance.dto.*;
import com.studentfinance.model.*;
import com.studentfinance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BudgetService {

    // Student allocation percentages (from spec)
    private static final BigDecimal SAVINGS_PCT  = new BigDecimal("0.10");
    private static final BigDecimal NEEDS_PCT    = new BigDecimal("0.50");
    private static final BigDecimal WANTS_PCT    = new BigDecimal("0.30");
    // Emergency buffer gets remainder (≈10%)

    private final BudgetRepository       budgetRepo;
    private final IncomeSourceRepository incomeRepo;
    private final ExpenseRepository      expenseRepo;
    private final SavingsGoalRepository  goalRepo;
    private final UserRepository         userRepo;

    /**
     * Savings-First Budget Allocation Algorithm
     * 1. Lock savings (10%) first
     * 2. Allocate needs (50%)
     * 3. Allocate wants (30%)
     * 4. Remainder → emergency buffer
     */
    @Transactional
    public Budget generateBudget(User user, int month, int year) {
        // Check if already exists
        Optional<Budget> existing = budgetRepo.findByUserIdAndMonthAndYear(user.getId(), month, year);
        if (existing.isPresent()) return existing.get();

        BigDecimal totalIncome = incomeRepo.sumMonthlyIncomeByUserId(user.getId());
        if (totalIncome == null || totalIncome.compareTo(BigDecimal.ZERO) == 0) {
            totalIncome = BigDecimal.valueOf(5000); // fallback
        }

        BigDecimal savings = totalIncome.multiply(SAVINGS_PCT).setScale(2, RoundingMode.HALF_UP);
        BigDecimal needs   = totalIncome.multiply(NEEDS_PCT).setScale(2, RoundingMode.HALF_UP);
        BigDecimal wants   = totalIncome.multiply(WANTS_PCT).setScale(2, RoundingMode.HALF_UP);
        BigDecimal buffer  = totalIncome.subtract(savings).subtract(needs).subtract(wants);

        // Check if there's a yearly goal recalibration needed
        BigDecimal dynamicTarget = computeDynamicTarget(user, savings);

        Budget budget = Budget.builder()
            .user(user)
            .month(month)
            .year(year)
            .totalIncome(totalIncome)
            .savingsTarget(savings)
            .needsAllocation(needs)
            .wantsAllocation(wants)
            .emergencyBuffer(buffer)
            .dynamicMonthlyTarget(dynamicTarget)
            .build();

        return budgetRepo.save(budget);
    }

    private BigDecimal computeDynamicTarget(User user, BigDecimal defaultSavings) {
        return goalRepo.findByUserIdAndIsYearlyTargetTrue(user.getId()).map(goal -> {
            if (goal.getIsCompleted()) return defaultSavings;
            BigDecimal remaining = goal.getTargetAmount().subtract(goal.getSavedSoFar());
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) return defaultSavings;
            LocalDate now = LocalDate.now();
            long monthsLeft = (goal.getDeadline() != null)
                ? java.time.temporal.ChronoUnit.MONTHS.between(now, goal.getDeadline()) + 1
                : 12 - now.getMonthValue() + 1;
            if (monthsLeft <= 0) return defaultSavings;
            return remaining.divide(BigDecimal.valueOf(monthsLeft), 2, RoundingMode.CEILING);
        }).orElse(defaultSavings);
    }

    public BudgetResponse getCurrentBudget(Long userId) {
        LocalDate now = LocalDate.now();
        Budget b = budgetRepo.findByUserIdAndMonthAndYear(userId, now.getMonthValue(), now.getYear())
            .orElseGet(() -> {
                User user = userRepo.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
                return generateBudget(user, now.getMonthValue(), now.getYear());
            });

        BigDecimal totalSpent = expenseRepo.sumByBudget(userId, b.getId());

        // Emergency fund progress
        BigDecimal emergencyBalance = BigDecimal.ZERO;
        BigDecimal emergencyTarget  = BigDecimal.ZERO;
        var efGoal = goalRepo.findByUserIdAndIsEmergencyFundTrue(userId);
        if (efGoal.isPresent()) {
            emergencyBalance = efGoal.get().getSavedSoFar();
            emergencyTarget  = efGoal.get().getTargetAmount();
        }

        return BudgetResponse.builder()
            .id(b.getId())
            .month(b.getMonth())
            .year(b.getYear())
            .totalIncome(b.getTotalIncome())
            .savingsTarget(b.getSavingsTarget())
            .needsAllocation(b.getNeedsAllocation())
            .wantsAllocation(b.getWantsAllocation())
            .emergencyBuffer(b.getEmergencyBuffer())
            .dynamicMonthlyTarget(b.getDynamicMonthlyTarget())
            .totalSpent(totalSpent != null ? totalSpent : BigDecimal.ZERO)
            .actualSaved(b.getSavingsTarget())   // locked savings
            .emergencyFundBalance(emergencyBalance)
            .emergencyFundTarget(emergencyTarget)
            .categoryAllocations(buildCategoryAllocations(b))
            .categoryBreakdown(buildCategoryBreakdown(userId, b.getId(), buildCategoryAllocations(b)))
            .build();
    }

    private Map<String, BigDecimal> buildCategoryAllocations(Budget b) {
        // Distribute needs/wants proportionally across standard categories
        Map<String, BigDecimal> map = new LinkedHashMap<>();
        // Needs (50% total) — distribute across need categories
        BigDecimal needs = b.getNeedsAllocation();
        map.put("Housing",      needs.multiply(new BigDecimal("0.40")).setScale(2, RoundingMode.HALF_UP));
        map.put("Food & Dining",needs.multiply(new BigDecimal("0.20")).setScale(2, RoundingMode.HALF_UP));
        map.put("Transport",    needs.multiply(new BigDecimal("0.15")).setScale(2, RoundingMode.HALF_UP));
        map.put("Grocery",      needs.multiply(new BigDecimal("0.15")).setScale(2, RoundingMode.HALF_UP));
        map.put("Utilities",    needs.multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP));
        map.put("Medical",      needs.multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP));
        // Wants (30% total)
        BigDecimal wants = b.getWantsAllocation();
        map.put("Entertainment",wants.multiply(new BigDecimal("0.35")).setScale(2, RoundingMode.HALF_UP));
        map.put("Shopping",     wants.multiply(new BigDecimal("0.35")).setScale(2, RoundingMode.HALF_UP));
        map.put("Education",    wants.multiply(new BigDecimal("0.30")).setScale(2, RoundingMode.HALF_UP));
        return map;
    }

    private List<BudgetResponse.CategoryBreakdownDto> buildCategoryBreakdown(Long userId, Long budgetId, Map<String, BigDecimal> allocations) {
        List<Expense> expenses = expenseRepo.findByUserIdAndBudgetIdOrderByDateDesc(userId, budgetId);
        Map<String, BigDecimal> spentMap = new HashMap<>();
        for (Expense e : expenses) {
            String catName = e.getCategory().getName();
            spentMap.put(catName, spentMap.getOrDefault(catName, BigDecimal.ZERO).add(e.getAmount()));
        }

        List<BudgetResponse.CategoryBreakdownDto> list = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> entry : allocations.entrySet()) {
            list.add(BudgetResponse.CategoryBreakdownDto.builder()
                .name(entry.getKey())
                .budgeted(entry.getValue())
                .spent(spentMap.getOrDefault(entry.getKey(), BigDecimal.ZERO))
                .build());
        }
        return list;
    }

    public YearlyProgressResponse getYearlyProgress(Long userId) {
        var goal = goalRepo.findByUserIdAndIsYearlyTargetTrue(userId)
            .orElseThrow(() -> new RuntimeException("No yearly goal set."));
        LocalDate now = LocalDate.now();
        long monthsLeft = goal.getDeadline() != null
            ? Math.max(1, java.time.temporal.ChronoUnit.MONTHS.between(now, goal.getDeadline()) + 1)
            : Math.max(1, 12 - now.getMonthValue() + 1);

        BigDecimal remaining = goal.getTargetAmount().subtract(goal.getSavedSoFar());
        BigDecimal dynamicTarget = remaining.compareTo(BigDecimal.ZERO) <= 0
            ? BigDecimal.ZERO
            : remaining.divide(BigDecimal.valueOf(monthsLeft), 2, RoundingMode.CEILING);

        double pct = goal.getTargetAmount().compareTo(BigDecimal.ZERO) == 0 ? 0
            : goal.getSavedSoFar().divide(goal.getTargetAmount(), 4, RoundingMode.HALF_UP).doubleValue() * 100;

        List<String> tips = buildRecoveryTips(userId, remaining, dynamicTarget);

        return YearlyProgressResponse.builder()
            .targetAmount(goal.getTargetAmount())
            .savedSoFar(goal.getSavedSoFar())
            .targetYear(goal.getDeadline() != null ? goal.getDeadline().getYear() : now.getYear())
            .monthsRemaining((int) monthsLeft)
            .dynamicMonthlyTarget(dynamicTarget)
            .percentComplete(pct)
            .recoveryTips(tips)
            .build();
    }

    private List<String> buildRecoveryTips(Long userId, BigDecimal gap, BigDecimal monthlyNeeded) {
        List<String> tips = new ArrayList<>();
        if (gap.compareTo(BigDecimal.ZERO) <= 0) {
            tips.add("🎉 You've reached your yearly savings goal! Consider increasing it for next year.");
            return tips;
        }
        BigDecimal diningCut = monthlyNeeded.multiply(new BigDecimal("0.40")).setScale(0, RoundingMode.HALF_UP);
        BigDecimal subCut    = monthlyNeeded.multiply(new BigDecimal("0.20")).setScale(0, RoundingMode.HALF_UP);
        BigDecimal shopCut   = monthlyNeeded.multiply(new BigDecimal("0.30")).setScale(0, RoundingMode.HALF_UP);

        tips.add("🍽️ Reducing dining out by ₹" + diningCut + " next month would close ~40% of your gap.");
        tips.add("🔄 Review your subscriptions — cancelling unused ones could save ₹" + subCut + "/month.");
        tips.add("🛍️ Cutting shopping by ₹" + shopCut + " for 2 months puts you back on track.");
        return tips;
    }
}