export class GlobalConstants {
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
    public static searchCustomer: string = "https://app.xuberantsolutions.com/api/v1/searchcustomer";
    public static installerStepTwo: string = "https://app.xuberantsolutions.com/api/v1/installersteptwo";
    public static searchCivilAndItems: string = "https://app.xuberantsolutions.com/api/v1/searchCivilAndItems";
    public static saveSite: string = "https://app.xuberantsolutions.com/api/v1/storesite";
    public static assignProject: string = "https://app.xuberantsolutions.com/api/v1/assignproject";
    // public static searchlist: string = "https://app.xuberantsolutions.com/api/v1/search";
    //sitestep
      //api/v1/getstepsite/

    public static logout(): void {
        try {
            localStorage.clear();
            sessionStorage.clear();
        } catch {
            /* private mode / storage blocked */
        }
    }
}