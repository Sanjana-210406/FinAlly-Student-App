package com.studentfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studentfinance.dto.*;
import com.studentfinance.model.User;
import com.studentfinance.repository.UserRepository;
import com.studentfinance.service.AuthService;
import com.studentfinance.service.BudgetService;
import com.studentfinance.service.ExpenseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class PredictiveControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthService authService;

    @Autowired
    private BudgetService budgetService;

    @Autowired
    private ExpenseService expenseService;

    private String token;
    private User testUser;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        RegisterRequest req = new RegisterRequest();
        req.setName("Predict User");
        req.setEmail("predict@test.com");
        req.setPassword("Password!123");
        req.setGender(User.Gender.FEMALE);
        req.setAge(22);
        req.setMonthlyIncome(BigDecimal.valueOf(20000));
        req.setYearlyTarget(BigDecimal.valueOf(40000));

        AuthResponse resp = authService.register(req);
        token = resp.getToken();
        testUser = userRepository.findByEmail("predict@test.com").orElseThrow();

        budgetService.generateBudget(testUser, LocalDate.now().getMonthValue(), LocalDate.now().getYear());
    }

    @Test
    void testForecast() throws Exception {
        // Add an expense
        ExpenseRequest exp = ExpenseRequest.builder()
                .amount(BigDecimal.valueOf(500))
                .description("Amazon Shopping")
                .date(LocalDate.now())
                .categoryId(7L) // Shopping
                .build();
        
        expenseService.addExpense(testUser, exp);

        // Even though elapsed days logic might vary depending on current date, we just ensure it responds without 500
        mockMvc.perform(get("/api/predictive/forecast")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categories").exists());
    }
}
