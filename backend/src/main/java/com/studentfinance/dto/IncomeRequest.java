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
public class IncomeRequest {
    @NotBlank  private String sourceName;
    @NotNull @Positive private BigDecimal amount;
    private IncomeSource.Frequency frequency;
    private IncomeSource.IncomeType incomeType;
}