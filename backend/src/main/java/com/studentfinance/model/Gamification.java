package com.studentfinance.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "gamification")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Gamification {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "streak_type")
    private StreakType streakType;

    @Column(name = "streak_count", nullable = false)
    private Integer streakCount = 0;

    @Column(name = "badge_code", length = 100)
    private String badgeCode;

    @Column(name = "awarded_at")
    private LocalDateTime awardedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }

    public enum StreakType {
        LOGGING, UNDER_BUDGET, SAVINGS_HIT, NO_EMOTIONAL_SPEND
    }
}
