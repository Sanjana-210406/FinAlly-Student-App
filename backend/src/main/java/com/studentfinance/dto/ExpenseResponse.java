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
public class ExpenseResponse {
    private Long       id;
    private BigDecimal amount;
    private String     description;
    private LocalDate  date;
    private String     categoryName;
    private String     categoryType;
    private String     categoryIcon;
    private Boolean    isAnomaly;
    private Boolean    isSubscription;
    private Boolean    isEmotionalSpend;
    private Boolean    isDuplicate;
    private String     classificationConfidence;
    private LocalDateTime createdAt;
}