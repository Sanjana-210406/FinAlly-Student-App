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
public class GamificationService {

    private final GamificationRepository gamiRepo;
    private final AlertService           alertService;

    @Transactional
    public void awardBadgeIfEligible(User user, String badgeCode) {
        if (!gamiRepo.existsByUserIdAndBadgeCode(user.getId(), badgeCode)) {
            gamiRepo.save(Gamification.builder()
                .user(user).badgeCode(badgeCode).awardedAt(LocalDateTime.now()).streakCount(0).build());
            alertService.createAlert(user, Alert.AlertType.BEHAVIORAL_BOT,
                "🏆 Badge Unlocked: " + formatBadge(badgeCode) + "! Keep up the great work!", null);
        }
    }

    @Transactional
    public void incrementStreak(User user, Gamification.StreakType type) {
        Gamification streak = gamiRepo.findByUserIdAndStreakType(user.getId(), type)
            .orElseGet(() -> Gamification.builder().user(user).streakType(type).streakCount(0).build());
        streak.setStreakCount(streak.getStreakCount() + 1);
        gamiRepo.save(streak);
        checkStreakBadges(user, type, streak.getStreakCount());
    }

    private void checkStreakBadges(User user, Gamification.StreakType type, int count) {
        if (type == Gamification.StreakType.LOGGING && count >= 7) awardBadgeIfEligible(user, "LOGGING_STREAK_7");
        if (type == Gamification.StreakType.SAVINGS_HIT && count >= 3) awardBadgeIfEligible(user, "SAVINGS_CHAMPION");
        if (type == Gamification.StreakType.UNDER_BUDGET && count >= 3) awardBadgeIfEligible(user, "UNDER_BUDGET_3");
    }

    public GamificationResponse getStatus(Long userId) {
        List<GamificationResponse.StreakDto> streaks = gamiRepo.findByUserId(userId).stream()
            .filter(g -> g.getStreakType() != null)
            .map(g -> GamificationResponse.StreakDto.builder()
                .streakType(g.getStreakType().name()).streakCount(g.getStreakCount()).build())
            .collect(Collectors.toList());
        List<GamificationResponse.BadgeDto> badges = gamiRepo.findByUserIdAndBadgeCodeIsNotNull(userId).stream()
            .map(g -> GamificationResponse.BadgeDto.builder()
                .badgeCode(g.getBadgeCode()).awardedAt(g.getAwardedAt()).build())
            .collect(Collectors.toList());
        return GamificationResponse.builder().streaks(streaks).badges(badges).build();
    }

    private String formatBadge(String code) {
        return code.replace('_', ' ').toLowerCase();
    }
}