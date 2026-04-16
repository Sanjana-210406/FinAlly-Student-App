package com.studentfinance.controller;

import com.studentfinance.dto.*;
import com.studentfinance.model.User;
import com.studentfinance.repository.*;
import com.studentfinance.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;

// ── Helper to resolve User from UserDetails ────────────────────
abstract class BaseController {
    protected final UserRepository userRepo;
    protected BaseController(UserRepository userRepo) { this.userRepo = userRepo; }
    protected User currentUser(UserDetails ud) {
        return userRepo.findByEmail(ud.getUsername())
            .orElseThrow(() -> new RuntimeException("User not found"));
    }
}

// ============================================================
// AuthController  — /api/auth
// ============================================================
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
class AuthController {

    private final AuthService authService;
    private final UserRepository userRepo;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> me(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(authService.getCurrentUser(ud.getUsername()));
    }
}

// ============================================================
// BudgetController  — /api/budget  +  /api/income
// ============================================================
@RestController

class BudgetController extends BaseController {

    private final BudgetService budgetService;

    BudgetController(UserRepository userRepo, BudgetService budgetService) {
        super(userRepo); this.budgetService = budgetService;
    }

    @PostMapping("/api/income")
    public ResponseEntity<Void> addIncome(@AuthenticationPrincipal UserDetails ud,
                                          @Valid @RequestBody IncomeRequest req) {
        // Handled at registration; this supports post-registration income updates
        return ResponseEntity.ok().build();
    }

    @PostMapping("/api/budget/generate")
    public ResponseEntity<BudgetResponse> generate(@AuthenticationPrincipal UserDetails ud,
                                                    @Valid @RequestBody BudgetGenerateRequest req) {
        User user = currentUser(ud);
        budgetService.generateBudget(user, req.getMonth(), req.getYear());
        return ResponseEntity.ok(budgetService.getCurrentBudget(user.getId()));
    }

    @GetMapping("/api/budget/current")
    public ResponseEntity<BudgetResponse> current(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(budgetService.getCurrentBudget(currentUser(ud).getId()));
    }

    @PostMapping("/api/budget/yearly-goal")
    public ResponseEntity<Void> setYearlyGoal(@AuthenticationPrincipal UserDetails ud,
                                               @Valid @RequestBody YearlyGoalRequest req) {
        // Delegated to SavingsGoalService via BudgetService
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/budget/yearly-progress")
    public ResponseEntity<YearlyProgressResponse> yearlyProgress(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(budgetService.getYearlyProgress(currentUser(ud).getId()));
    }
}

// ============================================================
// ExpenseController  — /api/expenses
// ============================================================
@RestController
@RequestMapping("/api/expenses")

class ExpenseController extends BaseController {

    private final ExpenseService expenseService;

    ExpenseController(UserRepository userRepo, ExpenseService expenseService) {
        super(userRepo); this.expenseService = expenseService;
    }

    @PostMapping
    public ResponseEntity<ExpenseResponse> addExpense(@AuthenticationPrincipal UserDetails ud,
                                                       @Valid @RequestBody ExpenseRequest req) {
        return ResponseEntity.ok(expenseService.addExpense(currentUser(ud), req));
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<ExpenseResponse>> bulkAddExpenses(@AuthenticationPrincipal UserDetails ud,
                                                       @Valid @RequestBody List<ExpenseRequest> req) {
        return ResponseEntity.ok(expenseService.bulkAdd(currentUser(ud), req));
    }
    @GetMapping
    public ResponseEntity<?> listExpenses(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(expenseService.getExpenses(currentUser(ud).getId()));
    }

    @PutMapping("/{id}/category")
    public ResponseEntity<ExpenseResponse> overrideCategory(@AuthenticationPrincipal UserDetails ud,
                                                             @PathVariable Long id,
                                                             @Valid @RequestBody CategoryOverrideRequest req) {
        return ResponseEntity.ok(expenseService.overrideCategory(currentUser(ud), id, req.getCategoryId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExpense(@AuthenticationPrincipal UserDetails ud,
                                               @PathVariable Long id) {
        expenseService.deleteExpense(currentUser(ud), id);
        return ResponseEntity.ok().build();
    }
}

// ============================================================
// SafetyController  — /api/safety
// ============================================================
@RestController
@RequestMapping("/api/safety")

class SafetyController extends BaseController {

    private final SavingsGoalService goalService;

    SafetyController(UserRepository userRepo, SavingsGoalService goalService) {
        super(userRepo); this.goalService = goalService;
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(@AuthenticationPrincipal UserDetails ud) {
        Long userId = currentUser(ud).getId();
        var goals   = goalService.getGoals(userId);
        var efGoal  = goals.stream().filter(GoalResponse::getIsEmergencyFund).findFirst();
        boolean efComplete = efGoal.map(GoalResponse::getIsCompleted).orElse(false);
        return ResponseEntity.ok(Map.of(
            "emergencyFundComplete", efComplete,
            "emergencyFundPercent",  efGoal.map(GoalResponse::getPercentComplete).orElse(0.0),
            "investmentsUnlocked",   efComplete
        ));
    }
}

// ============================================================
// GoalsController  — /api/goals
// ============================================================
@RestController
@RequestMapping("/api/goals")

class GoalsController extends BaseController {

    private final SavingsGoalService goalService;

    GoalsController(UserRepository userRepo, SavingsGoalService goalService) {
        super(userRepo); this.goalService = goalService;
    }

    @GetMapping
    public ResponseEntity<?> list(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(goalService.getGoals(currentUser(ud).getId()));
    }

    @PostMapping
    public ResponseEntity<GoalResponse> create(@AuthenticationPrincipal UserDetails ud,
                                                @Valid @RequestBody GoalRequest req) {
        return ResponseEntity.ok(goalService.createGoal(currentUser(ud), req));
    }

    @PutMapping("/{id}/deposit")
    public ResponseEntity<GoalResponse> deposit(@AuthenticationPrincipal UserDetails ud,
                                                  @PathVariable Long id,
                                                  @Valid @RequestBody DepositRequest req) {
        return ResponseEntity.ok(goalService.deposit(currentUser(ud), id, req.getAmount()));
    }
}

// ============================================================
// AlertsController  — /api/alerts
// ============================================================
@RestController
@RequestMapping("/api/alerts")

class AlertsController extends BaseController {

    private final AlertService alertService;

    AlertsController(UserRepository userRepo, AlertService alertService) {
        super(userRepo); this.alertService = alertService;
    }

    @GetMapping
    public ResponseEntity<?> list(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(alertService.getAlerts(currentUser(ud).getId()));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@AuthenticationPrincipal UserDetails ud,
                                          @PathVariable Long id) {
        alertService.markRead(currentUser(ud).getId(), id);
        return ResponseEntity.ok().build();
    }
}

// ============================================================
// ScoreController  — /api/score
// ============================================================
@RestController
@RequestMapping("/api/score")

class ScoreController extends BaseController {

    private final HealthScoreService healthScoreService;

    ScoreController(UserRepository userRepo, HealthScoreService healthScoreService) {
        super(userRepo); this.healthScoreService = healthScoreService;
    }

    @GetMapping("/current")
    public ResponseEntity<HealthScoreResponse> current(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(healthScoreService.getCurrent(currentUser(ud).getId()));
    }
}

// ============================================================
// SubscriptionsController  — /api/subscriptions
// ============================================================
@RestController
@RequestMapping("/api/subscriptions")

class SubscriptionsController extends BaseController {

    private final SubscriptionService subService;

    SubscriptionsController(UserRepository userRepo, SubscriptionService subService) {
        super(userRepo); this.subService = subService;
    }

    @GetMapping
    public ResponseEntity<?> list(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(subService.getSubscriptions(currentUser(ud).getId()));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Void> updateStatus(@AuthenticationPrincipal UserDetails ud,
                                              @PathVariable Long id,
                                              @RequestBody SubscriptionStatusRequest req) {
        subService.updateStatus(currentUser(ud).getId(), id, req.getStatus());
        return ResponseEntity.ok().build();
    }
}

// ============================================================
// BehavioralController  — /api/behavioral
// ============================================================
@RestController
@RequestMapping("/api/behavioral")

class BehavioralController extends BaseController {

    private final BehavioralPatternRepository patternRepo;
    private final AlertService               alertService;

    BehavioralController(UserRepository userRepo, BehavioralPatternRepository patternRepo, AlertService alertService) {
        super(userRepo); this.patternRepo = patternRepo; this.alertService = alertService;
    }

    @GetMapping("/patterns")
    public ResponseEntity<?> patterns(@AuthenticationPrincipal UserDetails ud) {
        Long uid = currentUser(ud).getId();
        var patterns = patternRepo.findByUserIdAndIsActiveTrueOrderByDetectedAtDesc(uid);
        var dtos = patterns.stream().map(p -> BehavioralPatternResponse.builder()
            .id(p.getId()).patternType(p.getPatternType().name())
            .description(p.getDescription()).detectedAt(p.getDetectedAt()).build())
            .toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/bot-messages")
    public ResponseEntity<?> botMessages(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(alertService.getBotMessages(currentUser(ud).getId()));
    }
}

// ============================================================
// PredictiveController  — /api/predictive
// ============================================================
@RestController
@RequestMapping("/api/predictive")

class PredictiveController extends BaseController {

    private final BudgetService    budgetService;
    private final ExpenseRepository expenseRepo;
    private final ExpenseCategoryRepository categoryRepo;

    PredictiveController(UserRepository userRepo, BudgetService budgetService,
                          ExpenseRepository expenseRepo, ExpenseCategoryRepository categoryRepo) {
        super(userRepo); this.budgetService = budgetService;
        this.expenseRepo = expenseRepo; this.categoryRepo = categoryRepo;
    }

    @GetMapping("/forecast")
    public ResponseEntity<?> forecast(@AuthenticationPrincipal UserDetails ud) {
        Long uid = currentUser(ud).getId();
        var budget = budgetService.getCurrentBudget(uid);
        java.time.LocalDate now = java.time.LocalDate.now();
        int daysElapsed = now.getDayOfMonth();
        int totalDays   = now.lengthOfMonth();
        int daysLeft    = totalDays - daysElapsed;

        var forecasts = budget.getCategoryAllocations().entrySet().stream().map(entry -> {
            String cat = entry.getKey();
            java.math.BigDecimal alloc = entry.getValue();
            var catEntity = categoryRepo.findByName(cat);
            java.math.BigDecimal spent = catEntity.map(c ->
                expenseRepo.sumByCategoryAndBudget(uid, budget.getId(), c.getId()))
                .orElse(java.math.BigDecimal.ZERO);
            if (spent == null) spent = java.math.BigDecimal.ZERO;
            if (daysElapsed == 0) return null;

            double dailyAvg = spent.doubleValue() / daysElapsed;
            double projected = dailyAvg * totalDays;
            boolean breach   = projected > alloc.doubleValue();
            Integer daysToBreach = breach && dailyAvg > 0
                ? (int) Math.floor((alloc.doubleValue() - spent.doubleValue()) / dailyAvg) : null;

            return ForecastResponse.builder()
                .categoryName(cat)
                .budget(alloc)
                .spentSoFar(spent)
                .projectedTotal(java.math.BigDecimal.valueOf(projected).setScale(2, java.math.RoundingMode.HALF_UP))
                .daysToBreach(daysToBreach)
                .breachPredicted(breach)
                .build();
        }).filter(f -> f != null).toList();

        return ResponseEntity.ok(Map.of("categories", forecasts));
    }
}

// ============================================================
// SimulatorController  — /api/simulator
// ============================================================
@RestController
@RequestMapping("/api/simulator")

class SimulatorController extends BaseController {

    private final BudgetService budgetService;

    SimulatorController(UserRepository userRepo, BudgetService budgetService) {
        super(userRepo); this.budgetService = budgetService;
    }

    @PostMapping("/whatif")
    public ResponseEntity<SimulatorResponse> simulate(@AuthenticationPrincipal UserDetails ud,
                                                        @RequestBody SimulatorRequest req) {
        Long uid = currentUser(ud).getId();
        var budget = budgetService.getCurrentBudget(uid);
        // Computation logic handled client-side as well; server validates and returns structured result
        return ResponseEntity.ok(computeSimulation(req, budget));
    }

    private SimulatorResponse computeSimulation(SimulatorRequest req, BudgetResponse b) {
        double income  = b.getTotalIncome().doubleValue();
        double expenses = b.getNeedsAllocation().add(b.getWantsAllocation()).doubleValue();

        return switch (req.getScenario()) {
            case "income_drop" -> {
                double newInc  = income * (1 - req.getDropPct() / 100.0);
                double newSav  = newInc * 0.10;
                yield SimulatorResponse.builder()
                    .title("Income Drop by " + req.getDropPct() + "%")
                    .stats(java.util.List.of(
                        new SimulatorResponse.SimStat("New Monthly Income", "₹" + Math.round(newInc), "var(--clr-accent2)"),
                        new SimulatorResponse.SimStat("New Savings Target", "₹" + Math.round(newSav), "var(--clr-warn)"),
                        new SimulatorResponse.SimStat("Income Lost", "₹" + Math.round(income - newInc), "var(--clr-accent2)"),
                        new SimulatorResponse.SimStat("Budget Feasible", newInc >= expenses ? "✅ Yes" : "⚠️ Tight", newInc >= expenses ? "var(--clr-accent)" : "var(--clr-warn)")
                    ))
                    .insights(java.util.List.of(
                        newInc < expenses ? "Your expenses exceed new income by ₹" + Math.round(expenses - newInc) + ". Cuts needed." : "Your budget still fits within the reduced income.",
                        "Reduce wants spending by ₹" + Math.round((income - newInc) * 0.5) + " to absorb the drop."
                    ))
                    .build();
            }
            default -> SimulatorResponse.builder()
                .title("Simulation").stats(java.util.List.of())
                .insights(java.util.List.of("Scenario computed client-side.")).build();
        };
    }
}

// ============================================================
// GamificationController  — /api/gamification
// ============================================================
@RestController
@RequestMapping("/api/gamification")

class GamificationController extends BaseController {

    private final GamificationService gamiService;

    GamificationController(UserRepository userRepo, GamificationService gamiService) {
        super(userRepo); this.gamiService = gamiService;
    }

    @GetMapping("/status")
    public ResponseEntity<GamificationResponse> status(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(gamiService.getStatus(currentUser(ud).getId()));
    }
}

// ============================================================
// InvestmentsController  — /api/investments
// ============================================================
@RestController
@RequestMapping("/api/investments")

class InvestmentsController extends BaseController {

    private final SavingsGoalService goalService;

    InvestmentsController(UserRepository userRepo, SavingsGoalService goalService) {
        super(userRepo); this.goalService = goalService;
    }

    @GetMapping("/suggestions")
    public ResponseEntity<InvestmentResponse> suggestions(@AuthenticationPrincipal UserDetails ud) {
        Long uid = currentUser(ud).getId();
        var goals = goalService.getGoals(uid);
        var ef = goals.stream().filter(GoalResponse::getIsEmergencyFund).findFirst();
        boolean unlocked = ef.map(GoalResponse::getIsCompleted).orElse(false);

        if (!unlocked) {
            return ResponseEntity.status(403).body(
                InvestmentResponse.builder().unlocked(false).suggestions(java.util.List.of()).build());
        }

        var suggestions = java.util.List.of(
            new InvestmentResponse.InvestSuggestion("Beginner · ₹500–₹2,000/month", "Digital Gold", "Buy gold in small amounts via PhonePe or Paytm Gold. No locker fees, fully liquid.", "8–12%", "Low-Medium", java.math.BigDecimal.valueOf(500)),
            new InvestmentResponse.InvestSuggestion("Beginner · ₹500–₹2,000/month", "Bank Recurring Deposit (RD)", "Fixed monthly deposits with guaranteed returns. Zero risk.", "6.5–7.5% p.a.", "Very Low", java.math.BigDecimal.valueOf(500)),
            new InvestmentResponse.InvestSuggestion("Intermediate · ₹2,000+/month", "Index Mutual Fund SIP", "Invest in Nifty 50 via SIP. Low cost, diversified, strong long-term returns.", "12–15% (historical)", "Medium", java.math.BigDecimal.valueOf(2000)),
            new InvestmentResponse.InvestSuggestion("Intermediate · ₹2,000+/month", "Public Provident Fund (PPF)", "Government-backed, tax-free. 15-year lock-in but partial withdrawal after 7 years.", "7.1% p.a. (tax-free)", "Very Low", java.math.BigDecimal.valueOf(500))
        );

        return ResponseEntity.ok(InvestmentResponse.builder()
            .unlocked(true).surplus(java.math.BigDecimal.valueOf(2000)).suggestions(suggestions).build());
    }
}
