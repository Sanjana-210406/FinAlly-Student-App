package com.studentfinance.dto;

import com.studentfinance.model.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class GamificationResponse {
    private List<StreakDto>  streaks;
    private List<BadgeDto>   badges;

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class StreakDto {
        private String  streakType;
        private Integer streakCount;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class BadgeDto {
        private String        badgeCode;
        private LocalDateTime awardedAt;
    }
}