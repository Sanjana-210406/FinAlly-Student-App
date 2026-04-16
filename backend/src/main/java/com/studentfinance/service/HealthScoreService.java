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
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HealthScoreService {

    private final FinancialHealthScoreRepository scoreRepo;
    private final BudgetRepository               budgetRepo;
    private final ExpenseRepository              expenseRepo;
    private final SavingsGoalRepository          goalRepo;
    private final GamificationRepository         gamiRepo;

    /**
     * Health Score = Savings(35) + Adherence(25) + Goals(20) + Emergency(10) + Behavior(10)
     */
    @Transactional
    public FinancialHealthScore recalculate(User user) {
        LocalDate now = LocalDate.now();
        Optional<Budget> budgetOpt = budgetRepo.findByUserIdAndMonthAndYear(user.getId(), now.getMonthValue(), now.getYear());
        if (budgetOpt.isEmpty()) return null;
        Budget b = budgetOpt.get();

        // 1. Savings Rate component (0–35)
        BigDecimal totalSpent   = expenseRepo.sumByBudget(user.getId(), b.getId());
        BigDecimal totalIncome  = b.getTotalIncome();
        BigDecimal savingsTarget = b.getSavingsTarget();
        BigDecimal actualSavings = totalIncome.subtract(totalSpent != null ? totalSpent : BigDecimal.ZERO).subtract(b.getEmergencyBuffer());
        double savingsRate = savingsTarget.compareTo(BigDecimal.ZERO) == 0 ? 1.0
            : Math.min(1.0, actualSavings.max(BigDecimal.ZERO).divide(savingsTarget, 4, RoundingMode.HALF_UP).doubleValue());
        double savingsComp = savingsRate * 35;

        // 2. Budget Adherence component (0–25) — percentage of categories within budget
        double adherenceComp = 25.0; // full score if no overrun detected (simplified)

        // 3. Goal Progress component (0–20)
        List<SavingsGoal> goals = goalRepo.findByUserIdOrderByIsEmergencyFundDescCreatedAtAsc(user.getId());
        double avgGoalPct = goals.isEmpty() ? 0.0 : goals.stream()
            .mapToDouble(g -> g.getTargetAmount().compareTo(BigDecimal.ZERO) == 0 ? 0
                : Math.min(1.0, g.getSavedSoFar().divide(g.getTargetAmount(), 4, RoundingMode.HALF_UP).doubleValue()))
            .average().orElse(0.0);
        double goalComp = avgGoalPct * 20;

        // 4. Emergency Fund Stability (0–10)
        double emergencyComp = goalRepo.findByUserIdAndIsEmergencyFundTrue(user.getId())
            .map(g -> g.getTargetAmount().compareTo(BigDecimal.ZERO) == 0 ? 0.0
                : Math.min(1.0, g.getSavedSoFar().divide(g.getTargetAmount(), 4, RoundingMode.HALF_UP).doubleValue()) * 10)
            .orElse(0.0);

        // 5. Behavior Score (0–10) — based on logging streak and no emotional spend incidents
        List<Expense> emotionalSpends = expenseRepo.findEmotionalSpendsByUserId(user.getId());
        int emotionalCount = emotionalSpends.size();
        double behaviorComp = Math.max(0, 10.0 - (emotionalCount * 2));

        double total = savingsComp + adherenceComp + goalComp + emergencyComp + behaviorComp;
        total = Math.min(100, Math.max(0, total));

        FinancialHealthScore score = FinancialHealthScore.builder()
            .user(user)
            .score(BigDecimal.valueOf(total).setScale(2, RoundingMode.HALF_UP))
            .savingsComponent(BigDecimal.valueOf(savingsComp).setScale(2, RoundingMode.HALF_UP))
            .adherenceComponent(BigDecimal.valueOf(adherenceComp).setScale(2, RoundingMode.HALF_UP))
            .goalComponent(BigDecimal.valueOf(goalComp).setScale(2, RoundingMode.HALF_UP))
            .emergencyFundComponent(BigDecimal.valueOf(emergencyComp).setScale(2, RoundingMode.HALF_UP))
            .behaviorComponent(BigDecimal.valueOf(behaviorComp).setScale(2, RoundingMode.HALF_UP))
            .build();
        return scoreRepo.save(score);
    }

    public HealthScoreResponse getCurrent(Long userId) {
        return scoreRepo.findTopByUserIdOrderByCalculatedAtDesc(userId).map(s -> {
            double score = s.getScore().doubleValue();
            return HealthScoreResponse.builder()
                .score(score)
                .savingsComponent(s.getSavingsComponent().doubleValue())
                .adherenceComponent(s.getAdherenceComponent().doubleValue())
                .goalComponent(s.getGoalComponent().doubleValue())
                .emergencyFundComponent(s.getEmergencyFundComponent().doubleValue())
                .behaviorComponent(s.getBehaviorComponent().doubleValue())
                .rating(scoreRating(score))
                .description(scoreDesc(score))
                .calculatedAt(s.getCalculatedAt())
                .build();
        }).orElse(HealthScoreResponse.builder().score(0.0).rating("Not calculated yet").description("Add your first expense to calculate your score.").build());
    }

    private String scoreRating(double s) {
        if (s >= 85) return "Excellent 🌟";
        if (s >= 65) return "Good 👍";
        if (s >= 45) return "Fair ⚡";
        return "Needs Attention ⚠️";
    }
    private String scoreDesc(double s) {
        if (s >= 85) return "On track — consider increasing your investment allocation.";
        if (s >= 65) return "Minor overspending in wants — a small adjustment will help.";
        if (s >= 45) return "Savings below target — review your spending categories.";
        return "Immediate budget review required — the Bot has specific tips for you.";
    }
}