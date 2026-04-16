package com.studentfinance.service;

import com.studentfinance.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class BehavioralBotServiceTest {

    @Autowired
    private BehavioralBotService behavioralBotService;

    @Test
    void testBuildPersonalizedMessageTeenFemale() throws Exception {
        User u = new User();
        u.setId(1L);
        u.setName("Priya");
        u.setAge(17);
        u.setGender(User.Gender.FEMALE);

        Method m = BehavioralBotService.class.getDeclaredMethod("buildPersonalizedMessage", User.class);
        m.setAccessible(true);
        String msg = (String) m.invoke(behavioralBotService, u);

        assertTrue(msg.contains("Priya"), "Message should contain user name");
        assertTrue(msg.contains("Hey") || msg.contains("💜"), "Female Teen persona should be emoji-rich");
    }

    @Test
    void testBuildPersonalizedMessageMidMale() throws Exception {
        User u = new User();
        u.setId(2L);
        u.setName("Arjun");
        u.setAge(21);
        u.setGender(User.Gender.MALE);

        Method m = BehavioralBotService.class.getDeclaredMethod("buildPersonalizedMessage", User.class);
        m.setAccessible(true);
        String msg = (String) m.invoke(behavioralBotService, u);

        assertTrue(msg.contains("Arjun"), "Message should contain user name");
        assertFalse(msg.contains("💜"), "Male Mid persona should be direct and less emoji-rich");
    }
}
