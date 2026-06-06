package com.jonnathas.backend.user.service;

import com.jonnathas.backend.user.infrastructure.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String identifier) {
        return userRepository.findByEmailIgnoreCaseOrDisplayNameIgnoreCase(identifier, identifier)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
