package com.macaorewards.api;

import com.macaorewards.api.dto.LoginRequest;
import com.macaorewards.api.dto.RegisterRequest;
import com.macaorewards.api.dto.TokenResponse;
import com.macaorewards.domain.User;
import com.macaorewards.repo.UserRepository;
import com.macaorewards.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthController(
            UserRepository users,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService
    ) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
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
}
