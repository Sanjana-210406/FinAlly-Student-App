package com.studentfinance.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name = "budgets",
  uniqueConstraints = @UniqueConstraint(columnNames = {"user_id","month","year"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Budget {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, columnDefinition = "TINYINT")
    private Integer month;

    @Column(nullable = false, columnDefinition = "SMALLINT")
    private Integer year;

    @Column(name = "total_income", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalIncome;

    @Column(name = "savings_target", nullable = false, precision = 12, scale = 2)
    private BigDecimal savingsTarget;

    @Column(name = "needs_allocation", nullable = false, precision = 12, scale = 2)
    private BigDecimal needsAllocation;

    @Column(name = "wants_allocation", nullable = false, precision = 12, scale = 2)
    private BigDecimal wantsAllocation;

    @Column(name = "emergency_buffer", nullable = false, precision = 12, scale = 2)
    private BigDecimal emergencyBuffer;

    @Column(name = "dynamic_monthly_target", precision = 12, scale = 2)
    private BigDecimal dynamicMonthlyTarget;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
