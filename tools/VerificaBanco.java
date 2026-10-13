package com.teste.app;

/** Verificador headless do banco do app gerado (usado pelos testes automatizados). */
public class VerificaBanco {
    public static void main(String[] args) throws Exception {
        boolean valido = Database.validarLoginEmUsuarios("admin", "1234");
        boolean senhaErrada = Database.validarLoginEmUsuarios("admin", "errada");
        boolean semUsuario = Database.validarLoginEmUsuarios("ninguem", "1234");
        System.out.println(
            "VERIFICA login_valido=" + valido
                + " senha_errada_rejeitada=" + !senhaErrada
                + " usuario_inexistente_rejeitado=" + !semUsuario
        );
        if (valido && !senhaErrada && !semUsuario) {
            System.out.println("BANCO_OK");
        } else {
            System.out.println("BANCO_FALHOU");
            System.exit(2);
        }
    }
}
