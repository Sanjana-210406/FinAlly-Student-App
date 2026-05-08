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
public class RegisterRequest {
    @NotBlank  private String name;
    @Email @NotBlank private String email;
    @NotBlank @Size(min = 8) private String password;
    @NotNull   private User.Gender gender;
    @Min(15) @Max(30) private Integer age;
    private String college;
    private String studyYear;
    private BigDecimal monthlyIncome;
    private IncomeSource.IncomeType incomeType;
    private BigDecimal yearlyTarget;
}