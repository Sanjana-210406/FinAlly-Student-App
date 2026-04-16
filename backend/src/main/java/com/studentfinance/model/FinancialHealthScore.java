package com.studentfinance.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name = "financial_health_scores")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FinancialHealthScore {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Overall score 0–100 */
    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal score;

    /** Savings Rate × 35 */
    @Column(name = "savings_component", nullable = false, precision = 5, scale = 2)
    private BigDecimal savingsComponent;

    /** Budget Adherence × 25 */
    @Column(name = "adherence_component", nullable = false, precision = 5, scale = 2)
    private BigDecimal adherenceComponent;

    /** Goal Progress × 20 */
    @Column(name = "goal_component", nullable = false, precision = 5, scale = 2)
    private BigDecimal goalComponent;

    /** Emergency Fund Stability × 10 */
    @Column(name = "emergency_fund_component", nullable = false, precision = 5, scale = 2)
    private BigDecimal emergencyFundComponent;

    /** Behavior Score × 10 */
    @Column(name = "behavior_component", nullable = false, precision = 5, scale = 2)
    private BigDecimal behaviorComponent;

    @Column(name = "calculated_at", nullable = false, updatable = false)
    private LocalDateTime calculatedAt;

    @PrePersist
    protected void onCreate() { calculatedAt = LocalDateTime.now(); }
}
