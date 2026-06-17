package com.jonnathas.backend.auth.service;

import com.jonnathas.backend.auth.dto.AuthResponse;
import com.jonnathas.backend.auth.dto.LoginRequest;
import com.jonnathas.backend.auth.dto.RegisterRequest;
import com.jonnathas.backend.auth.dto.UserResponse;
import com.jonnathas.backend.security.JwtService;
import com.jonnathas.backend.user.entity.User;
import com.jonnathas.backend.user.entity.UserRole;
import com.jonnathas.backend.user.infrastructure.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    public AuthService(
            AuthenticationManager authenticationManager,
            PasswordEncoder passwordEncoder,
            UserRepository userRepository,
            JwtService jwtService
    ) {
        this.authenticationManager = authenticationManager;
        this.passwordEncoder = passwordEncoder;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (!request.password().equals(request.confirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords do not match");
        }

        String email = request.email().trim().toLowerCase();
        String username = request.username().trim();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already in use");
        }

        if (userRepository.existsByDisplayNameIgnoreCase(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username is already in use");
        }

        User user = new User();
        user.setEmail(email);
        user.setDisplayName(username);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(UserRole.USER);

        User savedUser = userRepository.save(user);
        return buildResponse(savedUser);
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.identifier(), request.password())
            );
        } catch (BadCredentialsException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email ou senha incorretos");
        }

        User user = userRepository.findByEmailIgnoreCaseOrDisplayNameIgnoreCase(
                        request.identifier(),
                        request.identifier()
                )
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email ou senha incorretos"));

        return buildResponse(user);
    }

    private AuthResponse buildResponse(User user) {
        Instant expiresAt = jwtService.getExpiresAt();
        String token = jwtService.generateToken(user);
        return new AuthResponse(
                token,
                "Bearer",
                expiresAt,
                UserResponse.from(user)
        );
    }
}
