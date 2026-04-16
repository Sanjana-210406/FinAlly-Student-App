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
public class UserDto {
    private Long   id;
    private String name;
    private String email;
    private String profileType;
    private String gender;
    private Integer age;
    private String college;
    private String studyYear;
    private LocalDateTime createdAt;
}