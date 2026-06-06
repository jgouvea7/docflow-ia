package com.jonnathas.backend.security;

import com.jonnathas.backend.user.entity.User;
import com.jonnathas.backend.user.service.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtDecoder jwtDecoder;
    private final CustomUserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtDecoder jwtDecoder, CustomUserDetailsService userDetailsService) {
        this.jwtDecoder = jwtDecoder;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            String token = resolveBearerToken(request.getHeader(HttpHeaders.AUTHORIZATION));
            if (token != null) {
                try {
                    Jwt jwt = jwtDecoder.decode(token);
                    User user = (User) userDetailsService.loadUserByUsername(jwt.getSubject());
                    Authentication authentication = new UsernamePasswordAuthenticationToken(
                            user,
                            null,
                            user.getAuthorities()
                    );
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                } catch (JwtException | ClassCastException ignored) {
                    SecurityContextHolder.clearContext();
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private String resolveBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }

        String token = authorizationHeader.substring(7).trim();
        return token.isEmpty() ? null : token;
    }
}
