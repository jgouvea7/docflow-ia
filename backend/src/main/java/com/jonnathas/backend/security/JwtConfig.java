package com.jonnathas.backend.security;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.KeyUse;
import com.nimbusds.jose.jwk.OctetSequenceKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

@Configuration
public class JwtConfig {

    @Bean
    JwtEncoder jwtEncoder(@Value("${app.security.jwt.secret}") String secret) {
        OctetSequenceKey jwk = new OctetSequenceKey.Builder(secretKey(secret))
                .keyUse(KeyUse.SIGNATURE)
                .algorithm(JWSAlgorithm.HS256)
                .build();

        return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(jwk)));
    }

    @Bean
    JwtDecoder jwtDecoder(@Value("${app.security.jwt.secret}") String secret) {
        SecretKey secretKey = secretKey(secret);
        return NimbusJwtDecoder.withSecretKey(secretKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
    }

    private SecretKey secretKey(String secret) {
        byte[] decoded = Base64.getDecoder().decode(secret);
        return new SecretKeySpec(decoded, "HmacSHA256");
    }
}
