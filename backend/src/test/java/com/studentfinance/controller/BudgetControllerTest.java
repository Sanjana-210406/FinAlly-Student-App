package com.studentfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studentfinance.dto.*;
import com.studentfinance.model.User;
import com.studentfinance.repository.UserRepository;
import com.studentfinance.service.AuthService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class BudgetControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthService authService;

    private String token;
    private User testUser;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        RegisterRequest req = new RegisterRequest();
        req.setName("Budget User");
        req.setEmail("budget@test.com");
        req.setPassword("Password!123");
        req.setGender(User.Gender.MALE);
        req.setAge(21);
        req.setMonthlyIncome(BigDecimal.valueOf(10000));
        req.setYearlyTarget(BigDecimal.valueOf(20000));

        AuthResponse resp = authService.register(req);
        token = resp.getToken();
        testUser = userRepository.findByEmail("budget@test.com").orElseThrow();
    }

    @Test
    void testGenerateBudget() throws Exception {
        BudgetGenerateRequest req = new BudgetGenerateRequest(LocalDate.now().getMonthValue(), LocalDate.now().getYear());

        mockMvc.perform(post("/api/budget/generate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.savingsAllocation").value(1000)) // 10%
                .andExpect(jsonPath("$.needsAllocation").value(5000))  // 50%
                .andExpect(jsonPath("$.wantsAllocation").value(3000)); // 30%
    }

    @Test
    void testGetCurrentBudgetFailsIfNotGenerated() throws Exception {
        mockMvc.perform(get("/api/budget/current")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }
}
