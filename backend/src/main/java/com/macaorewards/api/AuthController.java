package com.macaorewards.api;

import com.macaorewards.api.dto.LoginRequest;
import com.macaorewards.api.dto.GoogleLoginRequest;
import com.macaorewards.api.dto.RegisterRequest;
import com.macaorewards.api.dto.TokenResponse;
import com.macaorewards.domain.User;
import com.macaorewards.repo.UserRepository;
import com.macaorewards.security.JwtService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final String googleClientId;

    public AuthController(
            UserRepository users,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            @Value("${app.google.client-id:}") String googleClientId
    ) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.googleClientId = googleClientId;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public TokenResponse register(@Valid @RequestBody RegisterRequest body) {
        if (users.existsByUsername(body.username())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "使用者名稱已存在");
        }
        User u = new User();
        u.setUsername(body.username().trim());
        u.setPasswordHash(passwordEncoder.encode(body.password()));
        users.save(u);
        String token = jwtService.createToken(u.getUsername());
        return new TokenResponse(token, u.getUsername());
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest body) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(body.username().trim(), body.password())
        );
        String token = jwtService.createToken(body.username().trim());
        return new TokenResponse(token, body.username().trim());
    }

    @PostMapping("/google")
    public TokenResponse google(@Valid @RequestBody GoogleLoginRequest body) {
        if (googleClientId == null || googleClientId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Google Client ID 未設定");
        }

        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(),
                JacksonFactory.getDefaultInstance()
        ).setAudience(Collections.singletonList(googleClientId)).build();

        GoogleIdToken idToken;
        try {
            idToken = verifier.verify(body.idToken());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google token 驗證失敗");
        }
        if (idToken == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google token 無效");
        }

        var payload = idToken.getPayload();
        String email = payload.getEmail();
        Boolean emailVerified = payload.getEmailVerified();
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google 帳號未提供 email");
        }
        if (!Boolean.TRUE.equals(emailVerified)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google email 未驗證");
        }

        String username = email.trim().toLowerCase(Locale.ROOT);
        User u = users.findByUsername(username).orElseGet(() -> {
            User nu = new User();
            nu.setUsername(username);
            // Google 使用者不走帳密登入：給一個不可猜的隨機密碼雜湊，避免被當成可帳密登入帳號
            nu.setPasswordHash(passwordEncoder.encode(UUID.randomUUID() + ":" + UUID.randomUUID()));
            return users.save(nu);
        });

        String token = jwtService.createToken(u.getUsername());
        return new TokenResponse(token, u.getUsername());
    }
}
