package com.gameranking.service.steam;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Cache simples em memoria, com validade e limite de itens (descarta o usado ha mais tempo).
 * Evita repetir chamadas a Steam, que limita o numero de consultas por minuto.
 */
class TtlCache<K, V> {

    private record Entry<V>(V value, Instant expiresAt) {
    }

    private final Duration ttl;
    private final Map<K, Entry<V>> entries;

    TtlCache(int maxEntries, Duration ttl) {
        this.ttl = ttl;
        this.entries = new LinkedHashMap<>(16, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<K, Entry<V>> eldest) {
                return size() > maxEntries;
            }
        };
    }

    /** Valor guardado, ou null se nao existir ou tiver vencido. */
    synchronized V get(K key) {
        Entry<V> entry = entries.get(key);
        if (entry == null) {
            return null;
        }
        if (Instant.now().isAfter(entry.expiresAt())) {
            entries.remove(key);
            return null;
        }
        return entry.value();
    }

    synchronized void put(K key, V value) {
        entries.put(key, new Entry<>(value, Instant.now().plus(ttl)));
    }
}
