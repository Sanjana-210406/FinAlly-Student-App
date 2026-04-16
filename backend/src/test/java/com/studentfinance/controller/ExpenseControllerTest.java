package com.studentfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studentfinance.dto.*;
import com.studentfinance.model.User;
import com.studentfinance.repository.UserRepository;
import com.studentfinance.service.AuthService;
import com.studentfinance.service.BudgetService;
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
import java.util.Arrays;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class ExpenseControllerTest {

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

    private String token;
    private User testUser;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        RegisterRequest req = new RegisterRequest();
        req.setName("Expense User");
        req.setEmail("expense@test.com");
        req.setPassword("Password!123");
        req.setGender(User.Gender.MALE);
        req.setAge(21);
        req.setMonthlyIncome(BigDecimal.valueOf(10000));
        req.setYearlyTarget(BigDecimal.valueOf(20000));

        AuthResponse resp = authService.register(req);
        token = resp.getToken();
        testUser = userRepository.findByEmail("expense@test.com").orElseThrow();

        // Must generate a budget to add expenses
        budgetService.generateBudget(testUser, LocalDate.now().getMonthValue(), LocalDate.now().getYear());
    }

    @Test
    void testAddSingleExpense() throws Exception {
        ExpenseRequest exp = ExpenseRequest.builder()
                .amount(BigDecimal.valueOf(150))
                .description("McDonalds Burger")
                .date(LocalDate.now())
                .build();

        mockMvc.perform(post("/api/expenses")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(exp)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(150.0))
                .andExpect(jsonPath("$.categoryName").value("Food & Dining"));
    }

    @Test
    void testBulkUploadWithSkipDuplicate() throws Exception {
        ExpenseRequest exp1 = ExpenseRequest.builder()
                .amount(BigDecimal.valueOf(200))
                .description("Zomato Pizza")
                .date(LocalDate.now())
                .build();

        ExpenseRequest exp2 = ExpenseRequest.builder()
                .amount(BigDecimal.valueOf(200))
                .description("Zomato Pizza")
                .date(LocalDate.now())
                .build(); // EXACT DUPLICATE

        List<ExpenseRequest> bulkReq = Arrays.asList(exp1, exp2);

        // Bulk array expects to return gracefully, skipping duplicate
        mockMvc.perform(post("/api/expenses/bulk")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(bulkReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size()").value(1)); // Only 1 should be added instead of failing whole transaction!
    }

    @Test
    void testGetExpenses() throws Exception {
        testAddSingleExpense();

        mockMvc.perform(get("/api/expenses")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size()").value(1));
    }
}
