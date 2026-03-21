export class GlobalConstants {
    /**
     * When true, the app skips the login and OTP screens and uses `devAuthUser`.
     * Set to false for production builds that require real authentication.
     */
    public static readonly skipLoginAndOtp = true;

    /** Minimal user shape used when `skipLoginAndOtp` is true (matches API `data.data` fields the app reads). */
    public static readonly devAuthUser = {
        id: 1,
        type: '1',
        name: 'Guest',
    };

    public static apiLogin: string = "https://app.xuberantsolutions.com/api/v1/login";
    public static otpverify: string = "https://app.xuberantsolutions.com/api/v1/verify";
    public static sitelist: string = "https://app.xuberantsolutions.com/api/v1/site";
    public static startproject: string = "https://app.xuberantsolutions.com/api/v1/save";
    public static multipleimages: string = "https://app.xuberantsolutions.com/api/v1/multipleimages";
    public static base64imageupload: string = "https://app.xuberantsolutions.com/api/v1/base64imageupload";
    public static daylist: string = "https://app.xuberantsolutions.com/api/v1/daylist/";
    public static serialnumberverify: string = "https://app.xuberantsolutions.com/api/v1/serialnumberverify";
    public static sendotpcustomer: string = "https://app.xuberantsolutions.com/api/v1/sendotpcustomer";
    public static marktocomplete: string = "https://app.xuberantsolutions.com/api/v1/marktocomplete";
    public static getscanlist: string = "https://app.xuberantsolutions.com/api/v1/getscanlist/";
    public static pathimg: string = "https://app.xuberantsolutions.com/public/files/watermark/";
    public static sitestep: string = "https://app.xuberantsolutions.com/api/v1/sitestep/";
    public static getstepsite: string = "https://app.xuberantsolutions.com/api/v1/getstepsite/";
    public static foundation: string = "https://app.xuberantsolutions.com/api/v1/foundation";
    // public static searchlist: string = "https://app.xuberantsolutions.com/api/v1/search";
    //sitestep
      //api/v1/getstepsite/

    /**
     * After explicit logout while `skipLoginAndOtp` is on, we must not auto-seed dev auth
     * until the user signs in again. Stored in sessionStorage (survives tab; cleared on app kill varies by OS).
     */
    private static readonly skipAuthLoggedOutKey = 'skipAuthLoggedOut';

    public static logout(): void {
        try {
            localStorage.clear();
            sessionStorage.clear();
        } catch {
            /* private mode / storage blocked */
        }
        if (GlobalConstants.skipLoginAndOtp) {
            try {
                sessionStorage.setItem(GlobalConstants.skipAuthLoggedOutKey, '1');
            } catch {
                /* storage blocked */
            }
        }
    }

    /** Call when the user starts/completes real login so dev bypass can work again on next cold start if needed. */
    public static clearSkipAuthLoggedOutFlag(): void {
        try {
            sessionStorage.removeItem(GlobalConstants.skipAuthLoggedOutKey);
        } catch {
            /* ignore */
        }
    }

    /** Ensures dev auth exists when skipping login (e.g. after cold start). */
    public static seedDevAuthIfSkipping(): void {
        if (!GlobalConstants.skipLoginAndOtp) {
            return;
        }
        try {
            if (sessionStorage.getItem(GlobalConstants.skipAuthLoggedOutKey) === '1') {
                return;
            }
        } catch {
            /* treat as not logged out */
        }
        const raw = localStorage.getItem('authlogin');
        if (raw == null || raw === '') {
            localStorage.setItem('authlogin', JSON.stringify(GlobalConstants.devAuthUser));
        }
    }
}