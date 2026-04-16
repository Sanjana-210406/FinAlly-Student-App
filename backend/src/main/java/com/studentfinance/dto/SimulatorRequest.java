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
public class SimulatorRequest {
    @NotBlank private String scenario;
    private Double  dropPct;
    private BigDecimal newExpAmount;
    private String  newExpLabel;
    private Integer lossMonths;
    private BigDecimal goalAmount;
    private Integer goalMonths;
}