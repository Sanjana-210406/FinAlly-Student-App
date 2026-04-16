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
public class HealthScoreResponse {
    private Double score;
    private Double savingsComponent;
    private Double adherenceComponent;
    private Double goalComponent;
    private Double emergencyFundComponent;
    private Double behaviorComponent;
    private String rating;
    private String description;
    private LocalDateTime calculatedAt;
}