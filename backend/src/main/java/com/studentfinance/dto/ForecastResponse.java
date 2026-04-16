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
public class ForecastResponse {
    private String     categoryName;
    private BigDecimal budget;
    private BigDecimal spentSoFar;
    private BigDecimal projectedTotal;
    private Integer    daysToBreach;
    private Boolean    breachPredicted;
}