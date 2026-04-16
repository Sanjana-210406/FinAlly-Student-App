package com.studentfinance.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "behavioral_patterns")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BehavioralPattern {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "pattern_type", nullable = false)
    private PatternType patternType;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(name = "detected_at", nullable = false, updatable = false)
    private LocalDateTime detectedAt;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @PrePersist
    protected void onCreate() { detectedAt = LocalDateTime.now(); }

    public enum PatternType {
        DAY_SPIKE, MONTH_END, MERCHANT_HABIT,
        CATEGORY_CREEP, IMPULSE_CLUSTER, SEASONAL
    }
}
