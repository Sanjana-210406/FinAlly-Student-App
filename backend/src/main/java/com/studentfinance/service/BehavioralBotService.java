package com.studentfinance.service;

import com.studentfinance.model.*;
import com.studentfinance.repository.*;
import com.studentfinance.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * BehavioralBotService — Primary Intelligence Engine
 *
 * Aggregates data from ALL modules and delivers personalized,
 * mentor-style messages to the dashboard.
 *
 * Message tone adapts based on:
 * - User's GENDER (Male / Female / Other)
 * - User's AGE GROUP (Teen 15-17 / Mid 18-22 / Senior 23-30)
 *
 * Age groups and their behavior:
 * - Teen (15–17): fun, emoji-heavy, gamification-focused, very encouraging
 * - Mid (18–22): practical, goal-oriented, slightly more analytical
 * - Senior (23–30): analytical, investment-ready, career/savings focused
 */
@Service
@RequiredArgsConstructor
public class BehavioralBotService {

    private final UserRepository            userRepo;
    private final AlertRepository           alertRepo;
    private final FinancialHealthScoreRepository scoreRepo;
    private final SavingsGoalRepository     goalRepo;
    private final ExpenseRepository         expenseRepo;
    private final SubscriptionRepository    subRepo;
    private final BehavioralPatternRepository patternRepo;
    private final AlertService              alertService;

    /**
     * Called after every significant event (transaction saved, score recalculated).
     * Generates and stores a ranked BEHAVIORAL_BOT alert.
     */
    public void generateBotMessage(User user) {
        String message = buildPersonalizedMessage(user);
        alertService.createAlert(user, Alert.AlertType.BEHAVIORAL_BOT, message, null);
    }

    /**
     * Scheduled: runs daily at 8 AM to generate proactive bot messages for all users.
     */
    @Scheduled(cron = "0 0 8 * * *")
    public void dailyBotMessages() {
        userRepo.findAll().forEach(this::generateBotMessage);
    }

    private String buildPersonalizedMessage(User user) {
        int age     = user.getAge() != null ? user.getAge() : 20;
        String gender = user.getGender() != null ? user.getGender().name() : "OTHER";
        String name   = user.getName().split(" ")[0];
        String ageGroup = age <= 17 ? "TEEN" : age >= 23 ? "SENIOR" : "MID";

        // Gather context
        var scoreOpt = scoreRepo.findTopByUserIdOrderByCalculatedAtDesc(user.getId());
        double score = scoreOpt.map(s -> s.getScore().doubleValue()).orElse(0.0);

        var alerts = alertRepo.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(user.getId());
        boolean hasPredictiveBreach = alerts.stream().anyMatch(a -> a.getAlertType() == Alert.AlertType.PREDICTIVE);
        boolean hasSubLeak = alerts.stream().anyMatch(a -> a.getAlertType() == Alert.AlertType.SUBSCRIPTION_LEAK);
        boolean hasDanger  = alerts.stream().anyMatch(a -> a.getAlertType() == Alert.AlertType.DANGER);

        var goals = goalRepo.findByUserIdOrderByIsEmergencyFundDescCreatedAtAsc(user.getId());
        var efGoal = goals.stream().filter(g -> g.getIsEmergencyFund()).findFirst();
        boolean efComplete = efGoal.map(g -> g.getIsCompleted()).orElse(false);
        double efPct = efGoal.map(g -> g.getTargetAmount().compareTo(BigDecimal.ZERO) == 0 ? 0.0
            : g.getSavedSoFar().divide(g.getTargetAmount(), 4, java.math.RoundingMode.HALF_UP).doubleValue() * 100)
            .orElse(0.0);

        long emotionalCount = expenseRepo.findEmotionalSpendsByUserId(user.getId()).size();
        long subCount = subRepo.findByUserIdOrderByStatusAscMerchantNameAsc(user.getId()).stream()
            .filter(s -> s.getStatus() == Subscription.SubscriptionStatus.ACTIVE).count();

        // ── Priority message logic (highest urgency first) ──────

        // Critical: score very low
        if (score < 45) {
            return buildLowScoreMessage(name, score, gender, ageGroup);
        }
        // Danger: predictive breach
        if (hasPredictiveBreach) {
            return buildPredictiveMessage(name, gender, ageGroup);
        }
        // Subscription leak
        if (hasSubLeak) {
            return buildSubLeakMessage(name, subCount, gender, ageGroup);
        }
        // Danger alert
        if (hasDanger) {
            return buildDangerMessage(name, gender, ageGroup);
        }
        // Emergency fund milestone
        if (!efComplete && efPct >= 80) {
            return buildEfAlmostMessage(name, efPct, gender, ageGroup);
        }
        // Investment unlock
        if (efComplete) {
            return buildInvestmentReadyMessage(name, gender, ageGroup);
        }
        // Emotional spending
        if (emotionalCount >= 3) {
            return buildEmotionalMessage(name, emotionalCount, gender, ageGroup);
        }
        // High score positive
        if (score >= 80) {
            return buildPositiveMessage(name, score, gender, ageGroup);
        }
        // Default motivational
        return buildDefaultMessage(name, gender, ageGroup);
    }

    // ── Message builders by persona ────────────────────────────

    private String buildLowScoreMessage(String name, double score, String gender, String ag) {
        if ("FEMALE".equals(gender)) {
            return "Hey " + name + " 💙 Your Health Score is at " + Math.round(score) + " — let's fix this together. Head to your Budget Breakdown to see which category needs attention.";
        }
        if ("TEEN".equals(ag)) {
            return "Yo " + name + "! 🚨 Score dropped to " + Math.round(score) + ". Quick fix: log today's expenses and check your Food budget.";
        }
        return "Hello " + name + ", your Financial Health Score is " + Math.round(score) + " — below target. Review your Budget Breakdown to find the main overspend area.";
    }

    private String buildPredictiveMessage(String name, String gender, String ag) {
        if ("FEMALE".equals(gender) && "TEEN".equals(ag)) {
            return "Heads up " + name + "! 📊 You're on track to exceed a budget category before month-end. Check Insights for the detailed forecast 💪";
        }
        if ("FEMALE".equals(gender)) {
            return name + ", the predictor spotted a potential budget breach coming. ✨ A quick review of your wants spending can prevent it.";
        }
        return name + ", you're projected to exceed a category budget before month-end. Check the Insights → Forecast section for exact figures.";
    }

    private String buildSubLeakMessage(String name, long count, String gender, String ag) {
        if ("FEMALE".equals(gender)) {
            return "Hey " + name + "! 🔄 You have " + count + " active subscription" + (count > 1 ? "s" : "") + " — are they all being used? A quick review in Subscriptions could save you money each month 💜";
        }
        if ("TEEN".equals(ag)) {
            return name + " 💸 Spotted " + count + " recurring subscription" + (count > 1 ? "s" : "") + ". Any you forgot about? Check the Subscriptions tab!";
        }
        return name + ", you have " + count + " active subscription" + (count > 1 ? "s" : "") + " detected. Head to Subscriptions to confirm they're all intentional.";
    }

    private String buildDangerMessage(String name, String gender, String ag) {
        if ("TEEN".equals(ag)) return "⚠️ " + name + " — you've hit a budget limit! Pause spending in that category for the rest of the month.";
        if ("FEMALE".equals(gender)) return name + " ⚠️ One of your budget categories is at 100%. Let's pause there and redirect to savings — you've got this!";
        return name + ", you've reached the limit in a spending category. Avoid adding more in that category until next month.";
    }

    private String buildEfAlmostMessage(String name, double pct, String gender, String ag) {
        if ("FEMALE".equals(gender)) {
            return "So close, " + name + "! 🌟 Your Emergency Fund is " + Math.round(pct) + "% complete! Just a bit more and you'll unlock Investments — keep saving!";
        }
        if ("TEEN".equals(ag)) {
            return "Almost there " + name + "! 🔥 Emergency Fund at " + Math.round(pct) + "%. Finish it to unlock the Investment tab!";
        }
        return name + ", your Emergency Fund is " + Math.round(pct) + "% funded. Complete it to unlock Investment Suggestions.";
    }

    private String buildInvestmentReadyMessage(String name, String gender, String ag) {
        if ("FEMALE".equals(gender)) {
            return "Amazing, " + name + "! ✨ Your Emergency Fund is fully funded! Head to Investments — you've earned the right to start growing your money 🎉";
        }
        if ("SENIOR".equals(ag)) {
            return name + ", your Emergency Fund is complete. The Investment tab is now unlocked — consider starting a small Index SIP given your current surplus.";
        }
        return name + ", Emergency Fund: complete ✅ Investment tab is now unlocked! Start with a small SIP — even ₹500/month compounds significantly over time.";
    }

    private String buildEmotionalMessage(String name, long count, String gender, String ag) {
        if ("FEMALE".equals(gender)) {
            return "Hey " + name + " 💭 You've had " + count + " impulse spending moments this month. That's okay — the 'review first' button is there for moments like these 💙";
        }
        if ("TEEN".equals(ag)) {
            return name + " — caught " + count + " impulse buys this month 😅 Try the 24-hour rule: wait a day before buying anything over ₹500.";
        }
        return name + ", there have been " + count + " emotional spending incidents this month. Pausing before a purchase can significantly improve your Behavior Score.";
    }

    private String buildPositiveMessage(String name, double score, String gender, String ag) {
        if ("FEMALE".equals(gender) && "TEEN".equals(ag)) {
            return "You're absolutely crushing it, " + name + "! 🌟 Score at " + Math.round(score) + " — you're in the top tier! Keep that savings streak alive 💪✨";
        }
        if ("FEMALE".equals(gender)) {
            return "Fantastic work, " + name + "! ✨ Your Health Score is " + Math.round(score) + " — consistently staying within budget. That discipline is building real financial freedom.";
        }
        if ("TEEN".equals(ag)) {
            return "Bro " + name + " 🔥 Score at " + Math.round(score) + "! You're built different. Keep logging and keep saving!";
        }
        if ("SENIOR".equals(ag)) {
            return name + ", strong performance — Health Score at " + Math.round(score) + ". Your budget adherence is your biggest strength this month.";
        }
        return "Great work, " + name + "! Health Score at " + Math.round(score) + ". Consistent logging and on-track savings — keep it going.";
    }

    private String buildDefaultMessage(String name, String gender, String ag) {
        if ("FEMALE".equals(gender) && "TEEN".equals(ag)) {
            return "Hey " + name + "! 💜 Log all your expenses today — even small ones. Small habits = big savings goals reached 🎯";
        }
        if ("FEMALE".equals(gender) && "MID".equals(ag)) {
            return "Hi " + name + " ✨ A quick tip: reviewing your Food & Dining spend is the fastest way to find extra savings this month.";
        }
        if ("FEMALE".equals(gender) && "SENIOR".equals(ag)) {
            return "Hello " + name + ", consistent saving builds real freedom. Your current habits look solid — keep them going and review your goal timeline.";
        }
        if ("MALE".equals(gender) && "TEEN".equals(ag)) {
            return "Yo " + name + "! Log your expenses daily — it takes 30 seconds and keeps your score high 🎯";
        }
        if ("MALE".equals(gender) && "MID".equals(ag)) {
            return "Hi " + name + ", check your wants category this week — there's usually room to redirect ₹500–1000 to savings without feeling it.";
        }
        if ("MALE".equals(gender) && "SENIOR".equals(ag)) {
            return "Hello " + name + ", with your income and savings rate, you're approaching investment readiness. Stay consistent through this month.";
        }
        return "Hello " + name + ", keep logging your daily expenses to get the most accurate financial insights and a higher Health Score.";
    }
}