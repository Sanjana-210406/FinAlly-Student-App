package com.studentfinance.service;

import com.studentfinance.dto.*;
import com.studentfinance.model.*;
import com.studentfinance.repository.*;
import com.studentfinance.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository         userRepo;
    private final IncomeSourceRepository incomeRepo;
    private final BudgetService          budgetService;
    private final SavingsGoalService     goalService;
    private final PasswordEncoder        passwordEncoder;
    private final JwtUtil                jwtUtil;
    private final AuthenticationManager  authManager;

    /**
     * Register a new Student user.
     * Gender + age are stored to personalize Behavioral Bot messages.
     * After registration: income is saved → budget auto-generated →
     * emergency fund goal auto-created → optional yearly goal set.
     */
    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepo.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }

        // 1. Create user
        User user = User.builder()
            .name(req.getName())
            .email(req.getEmail())
            .password(passwordEncoder.encode(req.getPassword()))
            .profileType(User.ProfileType.STUDENT)
            .gender(req.getGender() != null ? req.getGender() : User.Gender.OTHER)
            .age(req.getAge() != null ? req.getAge() : 20)
            .college(req.getCollege())
            .studyYear(req.getStudyYear())
            .build();
        user = userRepo.save(user);

        // 2. Save income source
        if (req.getMonthlyIncome() != null && req.getMonthlyIncome().compareTo(BigDecimal.ZERO) > 0) {
            IncomeSource income = IncomeSource.builder()
                .user(user)
                .sourceName(req.getIncomeType() != null ? req.getIncomeType().name().replace('_', ' ') : "Income")
                .amount(req.getMonthlyIncome())
                .frequency(IncomeSource.Frequency.MONTHLY)
                .incomeType(req.getIncomeType() != null ? req.getIncomeType() : IncomeSource.IncomeType.POCKET_MONEY)
                .build();
            incomeRepo.save(income);

            // 3. Auto-generate budget for current month
            LocalDate now = LocalDate.now();
            budgetService.generateBudget(user, now.getMonthValue(), now.getYear());

            // 4. Auto-create emergency fund goal
            goalService.createEmergencyFundGoal(user, req.getMonthlyIncome());

            // 5. Optional yearly goal
            if (req.getYearlyGoal() != null && req.getYearlyGoal().compareTo(BigDecimal.ZERO) > 0) {
                goalService.createYearlyGoal(user, req.getYearlyGoal(), now.getYear());
            }
        }

        String token = jwtUtil.generateToken(user);
        return AuthResponse.builder()
            .token(token)
            .user(toDto(user))
            .build();
    }

    public AuthResponse login(LoginRequest req) {
        authManager.authenticate(
            new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword())
        );
        User user = userRepo.findByEmail(req.getEmail())
            .orElseThrow(() -> new BadCredentialsException("Invalid credentials."));
        return AuthResponse.builder()
            .token(jwtUtil.generateToken(user))
            .user(toDto(user))
            .build();
    }

    public UserDto getCurrentUser(String email) {
        User user = userRepo.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found."));
        return toDto(user);
    }

    private UserDto toDto(User u) {
        return UserDto.builder()
            .id(u.getId())
            .name(u.getName())
            .email(u.getEmail())
            .profileType(u.getProfileType().name())
            .gender(u.getGender().name())
            .age(u.getAge())
            .college(u.getCollege())
            .studyYear(u.getStudyYear())
            .createdAt(u.getCreatedAt())
            .build();
    }
}