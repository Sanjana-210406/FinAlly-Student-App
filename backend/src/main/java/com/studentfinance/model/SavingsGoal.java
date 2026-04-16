package com.studentfinance.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

// ── SavingsGoal ────────────────────────────────────────────────
@Entity @Table(name = "savings_goals")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SavingsGoal {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "goal_name", nullable = false, length = 150)
    private String goalName;

    @Column(name = "target_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal targetAmount;

    @Column(name = "saved_so_far", nullable = false, precision = 12, scale = 2)
    private BigDecimal savedSoFar = BigDecimal.ZERO;

    @Column(name = "monthly_required", nullable = false, precision = 12, scale = 2)
    private BigDecimal monthlyRequired;

    private LocalDate deadline;

    @Column(name = "is_emergency_fund", nullable = false)
    private Boolean isEmergencyFund = false;

    @Column(name = "is_yearly_target", nullable = false)
    private Boolean isYearlyTarget = false;

    @Column(name = "is_completed", nullable = false)
    private Boolean isCompleted = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
