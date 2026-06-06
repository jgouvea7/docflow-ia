package com.jonnathas.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class InternalTokenFilter extends OncePerRequestFilter {

    private final String internalToken;

    public InternalTokenFilter(@Value("${app.security.internal-token}") String internalToken) {
        this.internalToken = internalToken;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null && requiresInternalAuth(request)) {
            String token = request.getHeader("X-Internal-Token");
            if (token == null || token.isBlank()) {
                filterChain.doFilter(request, response);
                return;
            }

            if (!internalToken.equals(token)) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid internal token");
                return;
            }

            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(
                            "internal-service",
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_SERVICE"))
                    )
            );
        }

        filterChain.doFilter(request, response);
    }

    private boolean requiresInternalAuth(HttpServletRequest request) {
        String method = request.getMethod();
        String uri = request.getRequestURI();
        return ("POST".equals(method) && uri.matches(".*/api/v1/documents/.+/content$"))
                || ("PATCH".equals(method) && uri.matches(".*/api/v1/jobs/.+/status$"));
    }
}
