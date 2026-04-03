package com.gameranking.web.controller;

import com.gameranking.service.UserService;
import com.gameranking.web.dto.user.UserSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public List<UserSummaryResponse> list() {
        return userService.listActiveUsers();
    }
}
