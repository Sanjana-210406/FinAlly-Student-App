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
public class SavingsGoalService {

    private final SavingsGoalRepository goalRepo;
    private final AlertService          alertService;
    private final GamificationService   gamiService;

    @Transactional
    public SavingsGoal createEmergencyFundGoal(User user, BigDecimal monthlyIncome) {
        if (goalRepo.findByUserIdAndIsEmergencyFundTrue(user.getId()).isPresent()) return null;
        // Emergency Fund Target = 3 × monthly expenses (≈ 80% of income)
        BigDecimal target = monthlyIncome.multiply(new BigDecimal("0.80"))
            .multiply(BigDecimal.valueOf(3)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal monthly = target.divide(BigDecimal.valueOf(12), 2, RoundingMode.CEILING);
        return goalRepo.save(SavingsGoal.builder()
            .user(user).goalName("Emergency Fund").targetAmount(target)
            .savedSoFar(BigDecimal.ZERO).monthlyRequired(monthly)
            .isEmergencyFund(true).isYearlyTarget(false).isCompleted(false)
            .deadline(LocalDate.now().plusYears(1))
            .build());
    }

    @Transactional
    public SavingsGoal createYearlyGoal(User user, BigDecimal targetAmount, int year) {
        goalRepo.findByUserIdAndIsYearlyTargetTrue(user.getId()).ifPresent(goalRepo::delete);
        LocalDate deadline = LocalDate.of(year, 12, 31);
        long months = Math.max(1, java.time.temporal.ChronoUnit.MONTHS.between(LocalDate.now(), deadline) + 1);
        BigDecimal monthly = targetAmount.divide(BigDecimal.valueOf(months), 2, RoundingMode.CEILING);
        return goalRepo.save(SavingsGoal.builder()
            .user(user).goalName("Yearly Savings Goal " + year).targetAmount(targetAmount)
            .savedSoFar(BigDecimal.ZERO).monthlyRequired(monthly)
            .isEmergencyFund(false).isYearlyTarget(true).isCompleted(false)
            .deadline(deadline)
            .build());
    }

    @Transactional
    public GoalResponse createGoal(User user, GoalRequest req) {
        long months = req.getDeadline() != null
            ? Math.max(1, java.time.temporal.ChronoUnit.MONTHS.between(LocalDate.now(), req.getDeadline()) + 1) : 12;
        BigDecimal monthly = req.getTargetAmount().divide(BigDecimal.valueOf(months), 2, RoundingMode.CEILING);
        BigDecimal initial = req.getInitialDeposit() != null ? req.getInitialDeposit() : BigDecimal.ZERO;
        SavingsGoal goal = goalRepo.save(SavingsGoal.builder()
            .user(user).goalName(req.getGoalName()).targetAmount(req.getTargetAmount())
            .savedSoFar(initial).monthlyRequired(monthly).deadline(req.getDeadline())
            .isEmergencyFund(false).isYearlyTarget(false)
            .isCompleted(initial.compareTo(req.getTargetAmount()) >= 0)
            .build());
        return toDto(goal);
    }

    @Transactional
    public GoalResponse deposit(User user, Long goalId, BigDecimal amount) {
        SavingsGoal goal = goalRepo.findById(goalId)
            .orElseThrow(() -> new RuntimeException("Goal not found."));
        if (!goal.getUser().getId().equals(user.getId())) throw new RuntimeException("Access denied.");
        goal.setSavedSoFar(goal.getSavedSoFar().add(amount));
        if (goal.getSavedSoFar().compareTo(goal.getTargetAmount()) >= 0) {
            goal.setSavedSoFar(goal.getTargetAmount());
            goal.setIsCompleted(true);
            gamiService.awardBadgeIfEligible(user, "FIRST_GOAL_COMPLETED");
            if (goal.getIsEmergencyFund()) {
                gamiService.awardBadgeIfEligible(user, "EMERGENCY_FUND_HERO");
                alertService.createAlert(user, Alert.AlertType.BEHAVIORAL_BOT,
                    "🎉 Your Emergency Fund is 100% complete! The Investment tab is now unlocked!", null);
            }
        }
        return toDto(goalRepo.save(goal));
    }

    public List<GoalResponse> getGoals(Long userId) {
        return goalRepo.findByUserIdOrderByIsEmergencyFundDescCreatedAtAsc(userId)
            .stream().map(this::toDto).collect(Collectors.toList());
    }

    private GoalResponse toDto(SavingsGoal g) {
        double pct = g.getTargetAmount().compareTo(BigDecimal.ZERO) == 0 ? 0
            : Math.min(100, g.getSavedSoFar().divide(g.getTargetAmount(), 4, RoundingMode.HALF_UP).doubleValue() * 100);
        Integer daysLeft = g.getDeadline() != null
            ? (int) java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), g.getDeadline()) : null;
        return GoalResponse.builder()
            .id(g.getId()).goalName(g.getGoalName()).targetAmount(g.getTargetAmount())
            .savedSoFar(g.getSavedSoFar()).monthlyRequired(g.getMonthlyRequired())
            .deadline(g.getDeadline()).isEmergencyFund(g.getIsEmergencyFund())
            .isYearlyTarget(g.getIsYearlyTarget()).isCompleted(g.getIsCompleted())
            .percentComplete(pct).daysLeft(daysLeft)
            .build();
    }
}