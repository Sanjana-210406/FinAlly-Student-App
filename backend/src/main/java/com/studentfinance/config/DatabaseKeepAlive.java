package com.studentfinance.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Keeps the Supabase PostgreSQL database alive by pinging it every 5 minutes.
 * Supabase may close idle connections—this prevents that.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseKeepAlive {

    private final JdbcTemplate jdbcTemplate;

    // Runs every 5 minutes (300,000 ms)
    @Scheduled(fixedDelay = 300_000, initialDelay = 60_000)
    public void ping() {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            log.debug("DB keep-alive ping OK");
        } catch (Exception e) {
            log.warn("DB keep-alive ping failed: {}", e.getMessage());
        }
    }
}
