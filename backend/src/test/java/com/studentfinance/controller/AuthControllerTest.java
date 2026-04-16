package com.studentfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studentfinance.dto.LoginRequest;
import com.studentfinance.dto.RegisterRequest;
import com.studentfinance.model.User;
import com.studentfinance.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void testRegisterNewUser() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setName("Test Student");
        req.setEmail("test@student.finally");
        req.setPassword("Password!123");
        req.setGender(User.Gender.FEMALE);
        req.setAge(20);
        req.setMonthlyIncome(BigDecimal.valueOf(10000));
        req.setYearlyTarget(BigDecimal.valueOf(20000));

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.user.name").value("Test Student"));
    }

    @Test
    void testLogin() throws Exception {
        // Register first
        testRegisterNewUser();

        LoginRequest loginReq = new LoginRequest();
        loginReq.setEmail("test@student.finally");
        loginReq.setPassword("Password!123");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists());
    }

    @Test
    void testRegisterExistingUserFails() throws Exception {
        testRegisterNewUser();

        RegisterRequest req = new RegisterRequest();
        req.setName("Another");
        req.setEmail("test@student.finally");
        req.setPassword("Password!123");
        req.setMonthlyIncome(BigDecimal.valueOf(10000));
        req.setYearlyTarget(BigDecimal.valueOf(20000));

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }
}
