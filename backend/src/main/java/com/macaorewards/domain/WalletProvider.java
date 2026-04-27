package com.macaorewards.domain;

/** 八款參與程式（與計畫一致） */
public enum WalletProvider {
    ALIPAY_MO("支付寶（澳門）"),
    BOC_MACAU_MOBILE("澳門中銀手機銀行"),
    CGB_WALLET("廣發移動支付錢包"),
    ICBC_EPAY("工銀e支付"),
    LUSO_PAY("Luso Pay 國際付"),
    MPAY("MPay"),
    FUNG_PAY_BAO("豐付寶"),
    UEPAY_MO("UePay 澳門錢包");

    private final String displayName;

    WalletProvider(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
