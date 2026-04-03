package com.gameranking.service;

import com.gameranking.repository.UserRepository;
import com.gameranking.web.dto.user.UserSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<UserSummaryResponse> listActiveUsers() {
        return userRepository.findAllByActiveTrueOrderByDisplayNameAsc().stream()
                .map(user -> new UserSummaryResponse(user.getId(), user.getDisplayName()))
                .toList();
    }
}
