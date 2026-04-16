package com.studentfinance;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * FinAlly Student Finance App — Spring Boot Entry Point
 * AI-Powered Smart Expense & Savings Management System
 */
@SpringBootApplication
@EnableScheduling
public class FinAllyApplication {
    public static void main(String[] args) {
        SpringApplication.run(FinAllyApplication.class, args);
    }
}
