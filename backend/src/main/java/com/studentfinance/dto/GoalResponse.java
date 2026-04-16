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
public class GoalResponse {
    private Long       id;
    private String     goalName;
    private BigDecimal targetAmount;
    private BigDecimal savedSoFar;
    private BigDecimal monthlyRequired;
    private LocalDate  deadline;
    private Boolean    isEmergencyFund;
    private Boolean    isYearlyTarget;
    private Boolean    isCompleted;
    private Double     percentComplete;
    private Integer    daysLeft;
}