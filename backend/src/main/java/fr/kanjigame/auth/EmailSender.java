package fr.kanjigame.auth;

public interface EmailSender {

    void send(String to, String subject, String htmlBody);
}
