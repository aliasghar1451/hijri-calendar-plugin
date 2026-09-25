/* =========================================================================
 * Hijri Calendar Plugin — Miqaats data (OPTIONAL add-on)
 * Version: 1.8.1 | Date: 2026-09-04
 * -------------------------------------------------------------------------
 * Miqaat (occasion) data transcribed from source/data/miqaats.json in
 * https://github.com/mygulamali/mumineen_calendar_js
 *
 * Load AFTER hijri-calendar-plugin.js:
 *   <script src="hijri-calendar-plugin.js"></script>
 *   <script src="hijri-calendar-miqaats.js"></script>
 *
 * This file is entirely optional — the picker works without it, and simply
 * shows no miqaat markers. It self-registers via HijriCalendar.setMiqaats().
 *
 * Stored as compact tuples to keep the file small:
 *   [ month, date, phase, priority, year, title, description ]
 *     month       1-based Hijri month (1 = Moharram al-Haraam)
 *                 (the upstream JSON is 0-based; converted here)
 *     date        1-based Hijri day
 *     phase       0 = day, 1 = night
 *     priority    1 = major, 2 = notable, 3 = minor
 *     year        null = every year, or a Hijri year this miqaat starts from
 *     description null when the upstream entry has none
 * ========================================================================= */
(function (global) {
  'use strict';

  var D = 0, N = 1;

  var T = [
    // ---- 1. Moharram al-Haraam ----
    [1,1,D,1,null,"Hijri New Year",null],
    [1,1,D,3,null,"Urus Mawlai Abdullah Saheb",null],
    [1,2,D,3,null,"Urus Mawlai Raj Bin Mawlai Hasan Saheb",null],
    [1,2,D,3,null,"Urus Syedi Khanji Fir Saheb",null],
    [1,2,D,3,null,"Urus Syedi Shaikh Pir Jamaluddin",null],
    [1,6,D,3,null,"Urus Syedi Mohammed Bin Qazikhan",null],
    [1,7,D,1,null,"Urus Syedna Ismail Badruddin (AQ)","38th Dai, Jamnagar, India."],
    [1,10,D,1,null,"Yawme Ashura",null],
    [1,10,D,1,null,"Shahadat Imam Hussain (SA)","2nd Imam, Karbala, Iraq."],
    [1,10,D,1,null,"Urus Syedna Zoeb Bin Musa (AQ)","1st Dai, Hawth, Yemen."],
    [1,10,D,3,null,"Urus Mawlai Ahmed Saheb",null],
    [1,11,N,1,null,"Suyum Imam Hussain (SA)","2nd Imam, Karbala, Iraq."],
    [1,14,D,3,null,"Urus Mawlai Lukmanji Mulla Alibhai Saheb",null],
    [1,15,D,3,null,"Urus Mawlai Nuruddin Saheb",null],
    [1,16,D,1,null,"Urus Syedna Hatim bin Syedna Ibrahim (AQ)","3rd Dai, Hutaib, Yemen."],
    [1,17,D,1,null,"Shahadat Imam Ali Zainulabedin (SA)","3rd Imam, Medina, Saudi Arabia."],
    [1,17,D,1,null,"Urus Syedna Ibrahim Vajihuddin (AQ)","39th Dai, Ujjain, India."],
    [1,17,D,3,null,"Urus Mulla Mohammedali bin Syedi Najam Khan",null],
    [1,17,D,3,null,"Urus Mawlai Masud bin Sulaiman",null],
    [1,17,D,3,null,"Urus Seven Shahid Sahebo",null],
    [1,18,D,3,null,"Urus Shahid Gani Pir Ibne Dawoodji",null],
    [1,23,D,2,null,"Urus Syedi Hasan Fir Saheb Shahid","Denmal, India."],
    [1,23,D,3,null,"Urus Noor Bibi Umme Syedna Yusuf Najmuddin",null],
    [1,23,D,3,null,"Urus Fatema Bibi Ukhte Syedna Yusuf Najmuddin",null],
    [1,24,D,3,null,"Urus Syedi Dada Sulemanji",null],
    [1,27,D,2,null,"Urus Syedi Fakhruddin Shahid (AQ)","Taherabad, India."],
    [1,28,D,3,null,"Urus Syedi Musaji bin Taj",null],
    [1,29,D,3,null,"Urus Mawlai Hasan Bin Mawlai Adam",null],

    // ---- 2. Safar al-Muzaffar ----
    [2,1,D,1,null,"Urus Syedna Ali Bin Syedna Hussain (AQ)","10th Dai, Sanaa, Yemen."],
    [2,3,D,1,null,"Urus Syedna Ali Shamsuddin Bin Syedna Abdullah (AQ)","18th Dai, Sharaqa, Yemen."],
    [2,4,D,1,null,"Urus Syedna Abdul Tayyib Zakiyuddin (AQ)","41st Dai, Burhanpur, India."],
    [2,6,D,3,null,"Urus Syedi Abdeali Imaduddin","Surat, India."],
    [2,8,D,1,null,"Urus Syedna Khattab Bin Hasan Hamdani (AQ)",null],
    [2,9,D,3,null,"Urus Syedi Tayyib bs Zainuddin",null],
    [2,12,D,1,null,"Urus Syedna Ahmed Hamiduddin Kirmani (RA)",null],
    [2,13,D,3,null,"Urus Mawlai Adam bin Sulaimanji",null],
    [2,14,D,3,null,"Urus Kaka Akela - Kaki Akeli",null],
    [2,14,D,3,null,"Urus Mawlai Noorbhai Saheb",null],
    [2,15,D,3,null,"Urus Syedi Hamza Bhaisaheb",null],
    [2,17,D,3,null,"Urus Mawlai Shaikh Saheb bin Sulaimanji",null],
    [2,17,D,3,null,"Urus Syedi Shaikh Ibrahim",null],
    [2,17,D,3,null,"Urus Shaikh AbdulHusain Shahid",null],
    [2,20,D,1,null,"Chelum Imam Hussain (SA)","2nd Imam, Karbala, Iraq."],
    [2,22,D,1,null,"Urus Syedna Hussain bin Syedna Ali (AQ)","8th Dai, Sanaa, Yemen."],
    [2,27,D,1,null,"Urus Syedna Mohammed Izziuddin (AQ)","23rd Dai, Zabid, Yemen."],
    [2,28,D,1,null,"Shahadat Imam Hassan (SA)","1st Imam, Medina, Saudi Arabia."],
    [2,29,D,3,null,"Urus Syedi Hasan Zakiyuddin",null],

    // ---- 3. Rabi al-Awwal ----
    [3,1,D,3,null,"Urus Syedi Shaikh Adam Safiyuddin",null],
    [3,1,D,3,null,"Urus Syedi Jamaluddin bin Shaikh Adam",null],
    [3,2,D,1,null,"Urus Syedna Abdul Tayyib Zakiyuddin bin Syedna Dawood bin Qutbub Shah (AQ)","29th Dai, Ahmedabad, India."],
    [3,4,D,3,null,"Urus Syedi Habibullah bin Mulla Adamji",null],
    [3,7,D,3,null,"Urus Syedi Shaikh Dawood Bhai Mulla Mehmoodji",null],
    [3,7,D,3,null,"Urus Syedi Abdeali Mohyiddin",null],
    [3,10,D,1,null,"Urus Syedna Abdullah Badruddin (AQ)","50th Dai, Surat, India."],
    [3,12,D,1,null,"Eid Milad un-Nabi (SA)",null],
    [3,12,D,2,null,"Urus Ummul Mumineen Amatullah Aaisaheba (QR)","London, UK."],
    [3,12,D,1,null,"Ayyam al-Ta'abudaat","Start of 40 days of ta'abudaat."],
    [3,14,D,3,null,"Urus Syedi Miaji Mulla Taj Saheb",null],
    [3,16,D,1,1435,"Urus Syedna Mohammed Burhanuddin (AQ)","52nd Dai, Mumbai, India."],
    [3,22,D,1,null,"Urus Syedna Ali bin Hanzala (AQ)","6th Dai, Yemen."],
    [3,22,D,3,null,"Urus Mawlai Dawood bin Raj Saheb",null],
    [3,23,D,3,null,"Urus Mawlai Raj Saheb",null],
    [3,23,D,3,null,"Urus Syedi Qazi Khan bin Ameen Shah",null],
    [3,25,D,1,null,"Urus Syedna Ali Shamsuddin bin Mawlai Hasan (AQ)","30th Dai, Hasanfir, India."],
    [3,28,D,3,null,"Urus Mohammad bin Hasan Saheb",null],

    // ---- 4. Rabi al-Aakhar ----
    [4,4,D,1,null,"Milad Imam uz-Zaman (SA)","21st Imam."],
    [4,5,D,3,null,"Urus Mia Saheb Maati Bhai Mulla Noor Bhai",null],
    [4,5,D,3,null,"Urus Mia Saheb Tayebji Shaikh Shams Khan",null],
    [4,8,D,3,null,"Urus Mawlai Raj bin Mulla Adam Saheb",null],
    [4,10,D,3,null,"Urus Syedi AbdulRasul Shahid",null],
    [4,14,D,3,null,"Urus Syedi Ismailji Shahid bin Abde Musa",null],
    [4,16,D,1,null,"Urus Syedna Jalal Shamsuddin (AQ) bin Hasan","25th Dai, Ahmedabad, India."],
    [4,20,D,1,null,"Milad Dai al-Muqaddas, Syedna Mohammed Burhanuddin (AQ)","52nd Dai, Mumbai, India."],
    [4,20,D,1,null,"Ayyam al-Ta'abudaat","End of 40 days of ta'abudaat."],
    [4,22,D,1,null,"Urus Syedna Musa Kalimuddin (AQ)","36th Dai, Jamnagar, India."],
    [4,22,D,3,null,"Urus Syedi Mulla Habibullah bin Shaikh Sultanali",null],
    [4,27,D,1,null,"Urus Syedna Dawood Burhanuddin bin Ajab Shah (AQ)","26th Dai, Ahmedabad, India."],
    [4,28,D,3,null,"Urus Kakaji Mulla Isa Bhai",null],

    // ---- 5. Jumada al-Ula ----
    [5,1,D,3,null,"Urus Syedna Ahmed Al Mukaraam",null],
    [5,3,D,3,null,"Urus Syedi Qazi Khan bin Ali",null],
    [5,8,D,3,null,"Urus Syedi Mulla Wahid Bhaisaheb bin Mulla Ibrahimji",null],
    [5,10,D,1,null,"Shahadat Maulatena Fatema tuz Zahra (SA)","Binte Nabi Mohammed Rasullulah (SA)."],
    [5,11,D,3,null,"Urus Mawlai Nooruddin Saheb","Dawngham, India."],
    [5,15,D,3,null,"Urus Mawlai Dawood bin Qazi Ahmed",null],
    [5,17,D,3,null,"Urus Syedi Dawood Bhaisaheb Shihabuddin",null],
    [5,21,D,3,null,"Urus Seth Chanda bhai ibne Karim Bhai",null],
    [5,23,D,3,null,"Urus Mulla Jaferji Jiwaji",null],
    [5,29,D,3,null,"Urus Syedi Jivanji bin Shaikh Dawood Bhaisaheb",null],

    // ---- 6. Jumada al-Ukhra ----
    [6,8,D,3,null,"Urus Syedi Luqmaanji bin Mulla Habibullah",null],
    [6,12,D,3,null,"Urus Mulla Tayyib Bawa bin Mulla Ibrahimji",null],
    [6,14,D,3,null,"Urus Ganje Shohoda",null],
    [6,15,D,1,null,"Urus Syedna Dawood Burhanuddin (AQ) bin Qutub Shah","27th Dai, Ahmedabad, India."],
    [6,15,D,3,null,"Urus Mawlai Ali bhai Shahid","Indore, India."],
    [6,18,D,1,null,"Urus Syedna Yusuf Najmuddin (AQ)","42nd Dai, Surat, India."],
    [6,18,D,3,null,"Urus Mawlai Adam ibne Dawood",null],
    [6,18,D,3,null,"Urus Moulai Burhanuddin Ibne Khoj Khan",null],
    [6,23,D,1,null,"Urus Syedna Ismail Badruddin (AQ) bin Mawlai Raj","34th Dai, Jamnagar, India."],
    [6,27,D,1,null,"Urus Syedna Qutub Khan Qutbuddin Shahid (AQ)","32nd Dai, Ahmedabad, India."],
    [6,27,D,1,null,"Urus Syedna Lamak bin Malik (RA)",null],
    [6,28,D,1,null,"Urus Syedna Ahmed bin Mubarak (AQ)","7th Dai, Hamdaan, Yemen."],
    [6,28,D,1,null,"Urus Syedna Yahya bin Syedna Lamak (AQ)",null],
    [6,29,D,1,null,"Urus Syedna Mohammed Badruddin (AQ)","46th Dai, Surat, India."],
    [6,29,N,1,null,"Rajab al-Asab Pehli raat","Washeq"],
    [6,29,D,1,null,"Urus Syedna Qadi Numan bin Mohammed (AQ)",null],
    [6,29,D,3,null,"Urus Ajab Busaheba Binte Syedna Qutubuddin Shahid (AQ)",null],

    // ---- 7. Rajab al-Asab ----
    [7,1,D,1,null,"Rajab al-Asab Pehli taarik","Rozu"],
    [7,2,D,3,null,"Urus Mawlai Raj bin Dawood",null],
    [7,2,D,3,null,"Urus Bhaiji Bhai Ibne Qazi Bhai",null],
    [7,4,D,1,null,"Urus Syedna Noor Mohammed Nooruddin (AQ)","37th Dai, Mandwi, India."],
    [7,4,D,3,null,"Urus Syedi Hasanji Badshah",null],
    [7,7,D,1,null,"Urus Syedna Shaikh Adam Safiyuddin (AQ)","28th Dai, Ahmedabad, India."],
    [7,8,D,3,null,"Urus Syedi Saifuddin Saheb",null],
    [7,12,D,3,null,"Urus Syedi Najam Khan bin Syedna Fir Khan Shujahuddin AQ",null],
    [7,13,D,1,null,"Milad Amir ul-Mumineen (SA)","Wasi Moulana Ali Ibn Ali Talib (SA)"],
    [7,13,D,1,null,"Ayyam ul-Beez","Rozu"],
    [7,14,D,1,null,"Ayyam ul-Beez","Rozu"],
    [7,14,D,1,null,"Urus Syedna Abdul Mutalib Najmuddin (AQ)","14th Dai, Zimarmar, Yemen."],
    [7,14,D,3,null,"Urus Mawlai Yaqub Saheb",null],
    [7,15,D,1,null,"Ayyam ul-Beez","Rozu"],
    [7,15,D,1,null,"Salaat uz-Zawaal",null],
    [7,17,D,1,null,"Ayyam al-Barakaat ul-Khuldiyah",null],
    [7,18,D,1,null,"Urus Syedna Ali Shamsuddin (AQ)","13th Dai, Zimarmar, Yemen."],
    [7,18,D,1,null,"Ayyam al-Barakaat ul-Khuldiyah",null],
    [7,19,D,1,null,"Urus Syedna Taher Saifuddin (AQ)","51st Dai, Mumbai, India."],
    [7,19,D,1,null,"Ayyam al-Barakaat ul-Khuldiyah",null],
    [7,24,D,3,null,"Urus Syedi Qamruddin Bhaisaheb bin Syedna Haibatullah Al Muaid (AQ)",null],
    [7,26,N,1,null,"Shab-e-Meraaj","Washeq"],
    [7,26,D,1,null,"Urus Syedna Abdulqadir Najmuddin (AQ)","47th Dai, Ujjain, India."],
    [7,27,D,1,null,"Yawm-al-Maba'th","Rozu"],
    [7,27,D,3,null,"Urus Syedi Miasaheb Alibhai bin Peeriji",null],
    [7,29,D,3,null,"Urus Syedi Luqmaanji bin Syedi Dawood bhai",null],

    // ---- 8. Shabaan al-Karim ----
    [8,1,D,1,null,"Urus Syedna Hebatullah Muayyadfiddin (AQ)","40th Dai, Ujjain, India."],
    [8,14,N,1,null,"Shab-e-Baraat","Washeq"],
    [8,15,D,1,null,"Urus Syedna Hasan Badruddin (AQ)","20th Dai, Masaar, Yemen."],
    [8,16,D,1,null,"Urus Syedna Ibrahim bin Husain (AQ)","2nd Dai, Ghailbani Hamid, Yemen."],
    [8,19,D,3,null,"Urus Syedi Saleh Bhaisaheb Saifuddin",null],
    [8,22,D,1,null,"Urus Moulatena Hurratul Maleka (RA)","Ummul Duat Mutlaqeen, Zijibla, Yemen."],
    [8,22,D,3,null,"Urus Syedi Shaikhfir bin Dawood Shahid",null],
    [8,25,D,3,null,"Urus Syedi Shams Khan bin Syedi Yusufji","Surat, India."],
    [8,29,N,1,null,"Ramadaan al-Moazzan Pehli raat",null],
    [8,29,D,1,null,"Urus Syedna Ali bin Mawla Mohammed al-Walid (AQ)","5th Dai, Haraaz, Yemen."],
    [8,29,D,3,null,"Urus Syedi Jiwanji bin Shaikh Dawoodbhai",null],

    // ---- 9. Ramadaan al-Moazzam ----
    [9,1,D,3,null,"Urus Shaikh Dawood Bhaisaheb",null],
    [9,2,D,3,null,"Urus Syedi Wali Bhaisaheb bin Syedi Habibullah",null],
    [9,4,D,3,null,"Urus Syedi Tayyib Bhaisaheb Zainuddin (AQ)",null],
    [9,8,D,3,null,"Urus Syedi Fazal Bhaisaheb Qutubuddin bin Syedna Abdullah (AQ)",null],
    [9,9,D,1,null,"Urus Syedna Abdullah Fakhruddin (AQ)","16th Dai, Zimarmar, Yemen."],
    [9,16,N,1,null,"Lailat al-Fahdil","Washeq"],
    [9,16,D,3,null,"Urus Syedi Hebatullah Jamaluddin",null],
    [9,18,N,1,null,"Lailat al-Fahdil","Washeq"],
    [9,19,D,1,null,"Shahadat Amir ul-Mumineen (SA)","Wasi Moulana Ali Ibn Ali Talib (SA)."],
    [9,19,D,1,null,"Urus Syedna Mohammed Ezzuddin (AQ)","44th Dai, Surat, India."],
    [9,20,N,1,null,"Lailat al-Fahdil","Washeq"],
    [9,21,D,1,null,"Wafaat Amir ul-Mumineen (SA)","Wasi Moulana Ali Ibn Ali Talib (SA)."],
    [9,22,N,1,null,"Lailat al-Qadr",null],
    [9,23,D,1,null,"Milad Dai az-Zamaan, Syedna Mufaddal Saifuddin (TUS)","53rd Dai al-Mutlaq"],
    [9,29,N,1,null,"Lailat al-Thala'theen",null],
    [9,30,N,1,null,"Lailat ul-Eid-ul-Fitr","Washeq, Takbira"],

    // ---- 10. Shawwal al-Mukarram ----
    [10,1,D,1,null,"Yawm al-Eid-ul-Fitr","Takbira until Asr"],
    [10,3,D,2,null,"Urus Shehzadi Sakina Bhensaheba","Mumbai, India."],
    [10,4,D,3,null,"Urus Syedi Yusufji",null],
    [10,4,D,3,null,"Urus Syedi Taiyebji Shahid",null],
    [10,5,D,1,null,"Urus Syedi Abdul Qadir Hakimuddin (AQ)","1st Urus, Burhanpur, India."],
    [10,6,D,1,null,"Urus Syedna Hasan Badruddin (AQ)","17th Dai, Zimarmar, Yemen."],
    [10,7,D,1,null,"Urus Syedna Mohammed bin Taher (AQ)","Yemen."],
    [10,8,D,1,null,"Urus Syedna Abbas bin Syedna Mohammed (AQ)","15th Dai, Hisne Afedat, Yemen."],
    [10,9,D,1,null,"Urus Syedna Qasim Khan Zainuddin (AQ)","31st Dai, Ahmedabad, India."],
    [10,10,D,1,null,"Urus Syedna Ibrahim bin Syedna Husain (AQ)","11th Dai, Hisne Afedat, Yemen."],
    [10,10,D,1,null,"Urus Syedna Husain Husamuddin (AQ)","21st Dai, Masaar, Yemen."],
    [10,10,D,3,null,"Urus Syedna Hebatullah Muayyadfiddin Shirazi (AQ)",null],
    [10,13,D,3,null,"Urus Syedi Aminji bin Jalal",null],
    [10,24,D,3,null,"Urus Shaikh Qutub Bhai bin Sulaimanji",null],
    [10,27,D,1,null,"Urus Syedi Abdul Qadir Hakimuddin (AQ)","2nd Urus, Burhanpur, India."],
    [10,27,D,3,null,"Urus Mia Saheb Abdeali Waliullah",null],
    [10,29,D,3,null,"Urus Syedi Bawa Mulla Khan Saheb","Rampura, India."],
    [10,29,D,3,null,"Urus Syedi Qasim Khan bin Hamza Bhai",null],
    [10,29,D,3,null,"Urus Mulla Salehbhai Ibne Najamkhan",null],

    // ---- 11. Zilqadah al-Haraam ----
    [11,9,D,1,null,"Urus Syedna Fir Khan Shujahuddin (AQ)","33rd Dai, Ahmedabad, India."],
    [11,11,D,1,null,"Urus Syedna Ali bin Mohammed Sulayhi (RA)","Yemen."],
    [11,11,D,3,null,"Urus Syedi Hasan bin Nuh Bharuji",null],
    [11,12,D,1,null,"Urus Syedna Abdul Tayyib Zakiyuddin (AQ)","35th Dai, Jamnagar, India."],
    [11,12,D,1,null,"Urus Syedna Abdeali Saifuddin (AQ)","43rd Dai, Surat, India."],
    [11,13,D,1,null,"Urus Syedna Ali bin Syedna Husain (AQ)","9th Dai, Sanaa, Yemen."],
    [11,15,D,1,null,"Urus Syedna Tayyib Zainuddin (AQ)","45th Dai, Surat, India."],
    [11,15,D,3,null,"Urus Bai Saheba Raani Baisaheba (RA)","Binte Syedna Ismail Badruddin (AQ)"],
    [11,19,D,1,null,"Urus Syedna Idris Imaduddin (AQ)","19th Dai, Shebaam, Yemen."],
    [11,21,D,1,null,"Urus Syedna Ali Shamsuddin (AQ)","22nd Dai, Masaar, Yemen."],
    [11,22,D,3,null,"Urus Syedi Shaikh Sadiq Ali Saheb",null],
    [11,25,D,1,null,"Urus Syedna Ali Shamsuddin bin Syedna Hatim (AQ)","4th Dai, Sanaa, Yemen."],
    [11,27,D,1,null,"Zikra Milad","Milad Syedna Taher Saifuddin (AQ), 51st Dai al-Mutlaq."],
    [11,27,D,3,null,"Urus Syedi Yusuf Khan bin Syedi Shams Khan",null],

    // ---- 12. Zilhaj al-Haraam ----
    [12,1,D,1,null,"Urus Syedna Mohammed bin Syedna Hatim (AQ)","12th Dai, Yemen."],
    [12,6,D,3,null,"Urus Syedi Khoj bin Malak",null],
    [12,9,D,1,null,"Yawm ul-Arafa","Takbira from Fajr"],
    [12,9,N,1,null,"Lailat al-Eid-al-Adha","Washeq"],
    [12,10,D,1,null,"Yawm al-Eid-al-Adha","Takbira"],
    [12,11,D,1,null,"Takbira",null],
    [12,12,D,1,null,"Takbira",null],
    [12,13,D,3,null,"Urus Mawlai Feroz bin Ismail",null],
    [12,13,D,1,null,"Takbira","Until Asr"],
    [12,16,D,1,null,"Urus Syedna Yusuf Najmuddin bin Sulaiman (AQ)","24th Dai, Taiba, Yemen."],
    [12,16,D,3,null,"Urus Syedi Ishaq Bhaishaeb Jamaluddin (AQ)",null],
    [12,18,D,1,null,"Yawm al-Eid-e-Gadhir-e-Khum","Rozu"],
    [12,27,D,1,null,"Urus Syedna Abdul Husain Husamuddin (AQ)","48th Dai, Ahmedabad, India."],
    [12,27,D,1,null,"Urus Syedna Mohammed Burhanuddin (AQ)","49th Dai, Surat, India."],
    [12,29,D,3,null,"Urus Ghanj Shohada",null]
  ];

  // Expand tuples into objects
  var MIQAATS = [];
  for (var i = 0; i < T.length; i++) {
    var r = T[i];
    MIQAATS.push({
      month: r[0],                        // 1-based Hijri month
      date: r[1],                         // 1-based Hijri day
      phase: r[2] === 1 ? 'night' : 'day',
      priority: r[3],
      year: r[4],
      title: r[5],
      description: r[6]
    });
  }

  global.HijriCalendarMiqaats = MIQAATS;

  if (global.HijriCalendar && typeof global.HijriCalendar.setMiqaats === 'function') {
    global.HijriCalendar.setMiqaats(MIQAATS);
  }

})(window);
