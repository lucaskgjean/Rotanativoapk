package com.rotafinanceira.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Garante que o aplicativo respeite a barra de status / relógio / entalhe do celular
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
