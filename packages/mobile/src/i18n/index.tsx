/**
 * Lightweight English/Hindi i18n for the mobile app.
 *
 * Design notes:
 *  - Static dictionary (no runtime fetching) keyed by short semantic keys.
 *    Defaults to English; user toggle flips to Hindi and persists to
 *    AsyncStorage so field staff don't have to re-toggle every launch.
 *  - A few strings need interpolation (counts, names).  `t('someKey', { n: 3 })`
 *    replaces `{n}` inside the template.
 *  - Server-driven strings (booth names, voter names, AC names) are NOT
 *    handled here — those come from the backend already localized (fields
 *    like `nameHi`, `fullNameHi`, etc.) or get transliterated on render.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Lang = 'en' | 'hi';

const STORAGE_KEY = '@i18n_lang';

// Every user-facing string lives in this dictionary.  New keys added on
// the English side should always have a Hindi counterpart — missing
// entries fall back to the English string so nothing crashes, but the UI
// will mix languages which is jarring.
const DICT: Record<string, { en: string; hi: string }> = {
  // Common
  loading: { en: 'Loading…', hi: 'लोड हो रहा है…' },
  cancel: { en: 'Cancel', hi: 'रद्द करें' },
  save: { en: 'Save', hi: 'सहेजें' },
  retry: { en: 'Retry', hi: 'पुनः प्रयास' },
  error: { en: 'Error', hi: 'त्रुटि' },
  required: { en: 'Required', hi: 'आवश्यक' },
  ok: { en: 'OK', hi: 'ठीक है' },
  optional: { en: 'optional', hi: 'वैकल्पिक' },

  // Login screen
  login_title: { en: 'Sign in', hi: 'साइन इन करें' },
  login_subtitle: { en: 'Use your Pollstics email and password', hi: 'अपनी Pollstics ईमेल और पासवर्ड का उपयोग करें' },
  login_email: { en: 'Email', hi: 'ईमेल' },
  login_password: { en: 'Password', hi: 'पासवर्ड' },
  login_button: { en: 'Sign in', hi: 'साइन इन करें' },
  login_signingIn: { en: 'Signing in…', hi: 'साइन इन हो रहा है…' },
  login_otpTitle: { en: 'Enter OTP', hi: 'OTP दर्ज करें' },
  login_otpSubtitle: { en: 'We sent a 6-digit code. Check the server console.', hi: 'हमने 6-अंकों का कोड भेजा है। सर्वर कंसोल देखें।' },
  login_verify: { en: 'Verify', hi: 'सत्यापित करें' },
  login_invalid: { en: 'Invalid credentials', hi: 'अवैध लॉगिन विवरण' },
  login_failed: { en: 'Login failed', hi: 'लॉगिन विफल' },
  login_required: { en: 'Email and password are required', hi: 'ईमेल और पासवर्ड आवश्यक हैं' },
  login_brand: { en: 'POLLSTICS', hi: 'POLLSTICS' },
  login_tagline: { en: 'Booth Outreach · Uttar Pradesh', hi: 'बूथ पहुँच · उत्तर प्रदेश' },
  login_email_placeholder: { en: 'Email address', hi: 'ईमेल पता' },
  login_password_placeholder: { en: 'Password', hi: 'पासवर्ड' },
  login_footer: { en: 'POLLSTICS · v1.0', hi: 'POLLSTICS · v1.0' },
  login_generic_error: { en: 'Something went wrong. Please try again.', hi: 'कुछ गलत हो गया। कृपया पुनः प्रयास करें।' },
  otp_screen_title: { en: 'OTP Verification', hi: 'OTP सत्यापन' },
  otp_screen_subtitle: { en: 'Enter the 6-digit code sent to\n{email}', hi: 'भेजा गया 6-अंकों का कोड दर्ज करें\n{email}' },
  otp_invalid_title: { en: 'Invalid OTP', hi: 'अवैध OTP' },
  otp_invalid_body: { en: 'The code you entered is incorrect. Please try again.', hi: 'आपने गलत कोड दर्ज किया है। कृपया पुनः प्रयास करें।' },
  otp_verify_failed: { en: 'Verification failed. Please try again.', hi: 'सत्यापन विफल। कृपया पुनः प्रयास करें।' },

  // Home screen
  home_greeting: { en: 'Namaste', hi: 'नमस्ते' },
  home_user_fallback: { en: 'User', hi: 'उपयोगकर्ता' },
  home_role_super: { en: 'Super Admin', hi: 'सुपर एडमिन' },
  home_role_staff: { en: 'Field Staff', hi: 'क्षेत्रीय कर्मचारी' },
  home_role_politician: { en: 'Politician', hi: 'राजनेता' },
  home_stat_booths: { en: 'Booths', hi: 'बूथ' },
  home_stat_done: { en: 'Done', hi: 'पूर्ण' },
  home_stat_pending: { en: 'Pending', hi: 'लंबित' },
  home_overall_progress: { en: 'Overall progress', hi: 'कुल प्रगति' },
  home_across_one: { en: 'Across 1 booth', hi: '1 बूथ में' },
  home_across_many: { en: 'Across {n} booths', hi: '{n} बूथों में' },
  home_queue_waiting_one: { en: '1 visit waiting to sync', hi: '1 भ्रमण सिंक के लिए प्रतीक्षा में' },
  home_queue_waiting_many: { en: '{n} visits waiting to sync', hi: '{n} भ्रमण सिंक के लिए प्रतीक्षा में' },
  home_queue_sub: { en: 'Tap to review and upload', hi: 'समीक्षा और अपलोड के लिए टैप करें' },
  home_quick_actions: { en: 'Quick actions', hi: 'त्वरित क्रियाएँ' },
  home_open_booths: { en: 'Open my booths', hi: 'मेरे बूथ खोलें' },
  home_open_booths_sub: { en: 'Visit voters and verify', hi: 'मतदाताओं का भ्रमण और सत्यापन' },
  home_sync_queue: { en: 'Sync queue', hi: 'सिंक कतार' },
  home_sync_queue_all_clear: { en: 'All clear', hi: 'सब साफ़' },
  home_sync_queue_pending_one: { en: '1 pending upload', hi: '1 अपलोड लंबित' },
  home_sync_queue_pending_many: { en: '{n} pending uploads', hi: '{n} अपलोड लंबित' },

  // Assignments screen
  assignments_title: { en: 'My Assignments', hi: 'मेरी नियुक्तियाँ' },
  assignments_count_one: { en: '1 booth', hi: '1 बूथ' },
  assignments_count_many: { en: '{n} booths', hi: '{n} बूथ' },
  assignments_overall: { en: '{n}% overall', hi: 'कुल {n}%' },
  assignments_loading: { en: 'Loading your booths…', hi: 'आपके बूथ लोड हो रहे हैं…' },
  assignments_empty: { en: 'No booths assigned yet', hi: 'अभी तक कोई बूथ नियुक्त नहीं' },
  assignments_empty_sub: { en: 'Ask your admin to assign a booth. Pull down to refresh when done.', hi: 'अपने एडमिन से बूथ नियुक्त करने को कहें। पूर्ण होने पर ताज़ा करने हेतु नीचे खींचें।' },
  assignments_unknown_booth: { en: 'Unknown booth', hi: 'अज्ञात बूथ' },
  assignments_of_voters: { en: '{done} of {total} voters', hi: '{total} में से {done} मतदाता' },
  assignments_serial: { en: 'Serial {from} – {to}', hi: 'क्रमांक {from} – {to}' },
  assignments_failed: { en: 'Failed to load assignments', hi: 'नियुक्तियाँ लोड करने में विफल' },
  assignments_part: { en: 'PART', hi: 'भाग' },

  // Booth voters screen
  boothVoters_filter_all: { en: 'All', hi: 'सभी' },
  boothVoters_filter_pending: { en: 'Pending', hi: 'लंबित' },
  boothVoters_filter_done: { en: 'Done', hi: 'पूर्ण' },
  boothVoters_search: { en: 'Search name, EPIC or serial', hi: 'नाम, EPIC या क्रमांक खोजें' },
  boothVoters_search_btn: { en: 'Search', hi: 'खोजें' },
  boothVoters_empty: { en: 'No voters found', hi: 'कोई मतदाता नहीं मिला' },
  boothVoters_empty_sub: { en: 'Try a different filter or clear the search.', hi: 'एक अलग फ़िल्टर आज़माएँ या खोज साफ़ करें।' },
  boothVoters_load_failed: { en: 'Failed to load voters', hi: 'मतदाता लोड करने में विफल' },
  boothVoters_done_badge: { en: 'DONE', hi: 'पूर्ण' },
  boothVoters_father: { en: 'S/o', hi: 'पुत्र/पुत्री' },

  // Voter visit screen
  visit_loading: { en: 'Loading voter details…', hi: 'मतदाता विवरण लोड हो रहा है…' },
  visit_load_failed: { en: 'Failed to load voter', hi: 'मतदाता लोड करने में विफल' },
  visit_done_badge: { en: 'Done', hi: 'पूर्ण' },
  visit_gender_male: { en: 'Male', hi: 'पुरुष' },
  visit_gender_female: { en: 'Female', hi: 'महिला' },
  visit_gender_other: { en: 'Other', hi: 'अन्य' },
  visit_years: { en: 'years', hi: 'वर्ष' },
  visit_label_father: { en: 'Father / Husband', hi: 'पिता / पति' },
  visit_label_caste: { en: 'Caste', hi: 'जाति' },
  visit_label_religion: { en: 'Religion', hi: 'धर्म' },
  visit_label_address: { en: 'Address', hi: 'पता' },
  visit_section_intention: { en: 'Voting Intention', hi: 'मतदान का इरादा' },
  visit_section_candidate: { en: 'Favourite Candidate', hi: 'पसंदीदा उम्मीदवार' },
  visit_section_party: { en: 'Party Support', hi: 'पार्टी समर्थन' },
  visit_section_caste: { en: 'Caste', hi: 'जाति' },
  visit_section_subCaste: { en: 'Sub-Caste', hi: 'उप-जाति' },
  visit_section_mobile: { en: 'Mobile Number', hi: 'मोबाइल नंबर' },
  visit_section_email: { en: 'Email', hi: 'ईमेल' },
  visit_section_aadhaar: { en: 'Aadhaar Number', hi: 'आधार संख्या' },
  visit_section_grievances: { en: 'Grievances', hi: 'शिकायतें' },
  visit_section_problem: { en: 'Problem / Concern', hi: 'समस्या / चिंता' },
  visit_section_remarks: { en: 'Remarks', hi: 'टिप्पणियाँ' },
  visit_section_photo: { en: 'Photo', hi: 'फ़ोटो' },
  visit_placeholder_candidate: { en: 'e.g. Ram Yadav', hi: 'उदा. राम यादव' },
  visit_placeholder_party: { en: 'Select party', hi: 'पार्टी चुनें' },
  visit_placeholder_caste: { en: 'Select caste', hi: 'जाति चुनें' },
  visit_placeholder_subCaste: { en: 'Select sub-caste', hi: 'उप-जाति चुनें' },
  visit_placeholder_mobile: { en: '10 digits', hi: '10 अंक' },
  visit_placeholder_email: { en: 'name@example.com', hi: 'name@example.com' },
  visit_placeholder_aadhaar: { en: '12 digits (optional)', hi: '12 अंक (वैकल्पिक)' },
  visit_placeholder_problem: { en: 'Describe any issue the voter is facing…', hi: 'मतदाता की समस्या का विवरण लिखें…' },
  visit_placeholder_remarks: { en: 'Optional notes from this visit…', hi: 'इस भ्रमण से वैकल्पिक टिप्पणियाँ…' },
  visit_selected_count: { en: '{n} selected', hi: '{n} चयनित' },
  visit_camera: { en: 'Camera', hi: 'कैमरा' },
  visit_gallery: { en: 'Gallery', hi: 'गैलरी' },
  visit_save_btn: { en: 'Save Visit', hi: 'भ्रमण सहेजें' },
  visit_preview_btn: { en: 'Preview & Submit', hi: 'पूर्वावलोकन और सबमिट' },
  visit_confirm_btn: { en: 'Confirm & Save', hi: 'पुष्टि और सहेजें' },
  visit_preview_title: { en: 'Review before submitting', hi: 'सबमिट करने से पहले जाँचें' },
  visit_preview_subtitle: { en: 'Make sure the details below are correct.', hi: 'सुनिश्चित करें कि नीचे दिए गए विवरण सही हैं।' },
  visit_picker_party_title: { en: 'Choose party', hi: 'पार्टी चुनें' },
  visit_picker_caste_title: { en: 'Choose caste', hi: 'जाति चुनें' },
  visit_picker_subCaste_title: { en: 'Choose sub-caste', hi: 'उप-जाति चुनें' },
  visit_picker_search: { en: 'Search…', hi: 'खोजें…' },
  visit_picker_empty: { en: 'No matches', hi: 'कोई मिलान नहीं' },
  visit_photo_attached: { en: 'Photo attached', hi: 'फ़ोटो संलग्न' },
  visit_hindi_keyboard_hint: {
    en: 'Tip: switch your phone keyboard to Hindi (Devanagari) for Hindi input. Data is saved in both languages automatically.',
    hi: 'सुझाव: हिंदी में टाइप करने के लिए फ़ोन के कीबोर्ड को हिंदी (देवनागरी) पर स्विच करें। डेटा स्वचालित रूप से दोनों भाषाओं में सहेजा जाता है।',
  },
  visit_dual_lang_note: {
    en: 'Saved in both Hindi and English',
    hi: 'हिंदी और अंग्रेज़ी दोनों में सहेजा गया',
  },
  visit_invalid_email: { en: 'Please enter a valid email address.', hi: 'कृपया मान्य ईमेल पता दर्ज करें।' },
  visit_invalid_aadhaar: { en: 'Aadhaar must be 12 digits.', hi: 'आधार 12 अंकों का होना चाहिए।' },
  visit_invalid_mobile: { en: 'Mobile number must be 10 digits.', hi: 'मोबाइल नंबर 10 अंकों का होना चाहिए।' },
  visit_required_intention: { en: 'Please select a voting intention', hi: 'कृपया मतदान का इरादा चुनें' },
  visit_label_voter_id: { en: 'Voter ID (EPIC)', hi: 'मतदाता पहचान पत्र (EPIC)' },
  visit_saved_title: { en: 'Saved', hi: 'सहेजा गया' },
  visit_saved_body: { en: 'Visit recorded successfully.', hi: 'भ्रमण सफलतापूर्वक दर्ज हुआ।' },
  visit_queued_title: { en: 'Queued', hi: 'कतारबद्ध' },
  visit_queued_body: { en: 'No internet. Saved locally — will sync when back online.', hi: 'इंटरनेट नहीं है। स्थानीय रूप से सहेजा गया — वापस ऑनलाइन होने पर सिंक होगा।' },
  visit_save_failed: { en: 'Save failed', hi: 'सहेजना विफल' },
  visit_intention_will: { en: 'Will Vote', hi: 'मतदान करेंगे' },
  visit_intention_may: { en: 'May Vote', hi: 'शायद करेंगे' },
  visit_intention_wont: { en: "Won't Vote", hi: 'मतदान नहीं' },
  visit_intention_first: { en: 'First-Time Voter', hi: 'पहली बार मतदाता' },
  grievance_Roads: { en: 'Roads', hi: 'सड़कें' },
  grievance_Water: { en: 'Water', hi: 'पानी' },
  grievance_Electricity: { en: 'Electricity', hi: 'बिजली' },
  grievance_Employment: { en: 'Employment', hi: 'रोज़गार' },
  grievance_Education: { en: 'Education', hi: 'शिक्षा' },
  grievance_Health: { en: 'Health', hi: 'स्वास्थ्य' },
  grievance_Pension: { en: 'Pension', hi: 'पेंशन' },
  grievance_Corruption: { en: 'Corruption', hi: 'भ्रष्टाचार' },
  grievance_LawAndOrder: { en: 'Law & Order', hi: 'कानून व्यवस्था' },
  grievance_Other: { en: 'Other', hi: 'अन्य' },

  // Queue screen
  queue_title: { en: 'Sync Queue', hi: 'सिंक कतार' },
  queue_empty: { en: 'All visits synced', hi: 'सभी भ्रमण सिंक हो गए' },
  queue_empty_sub: { en: 'Every visit you record goes straight to the server when you\u2019re online.', hi: 'ऑनलाइन होने पर दर्ज किया गया हर भ्रमण सीधे सर्वर पर जाता है।' },
  queue_sync_now: { en: 'Sync now', hi: 'अभी सिंक करें' },
  queue_status_pending: { en: 'Pending', hi: 'लंबित' },
  queue_status_uploading: { en: 'Uploading…', hi: 'अपलोड हो रहा है…' },
  queue_status_error: { en: 'Error — tap to retry', hi: 'त्रुटि — पुनः प्रयास हेतु टैप करें' },
  queue_online: { en: 'online', hi: 'ऑनलाइन' },
  queue_offline: { en: 'offline', hi: 'ऑफ़लाइन' },
  queue_status_one: { en: '1 pending · {state}', hi: '1 लंबित · {state}' },
  queue_status_many: { en: '{n} pending · {state}', hi: '{n} लंबित · {state}' },
  queue_synced_title: { en: 'Synced', hi: 'सिंक हो गया' },
  queue_synced_one: { en: '1 visit uploaded.', hi: '1 भ्रमण अपलोड हो गया।' },
  queue_synced_many: { en: '{n} visits uploaded.', hi: '{n} भ्रमण अपलोड हो गए।' },
  queue_offline_title: { en: 'Offline', hi: 'ऑफ़लाइन' },
  queue_offline_body: { en: 'No internet. The queue will sync automatically when back online.', hi: 'इंटरनेट नहीं है। वापस ऑनलाइन होने पर कतार स्वतः सिंक हो जाएगी।' },
  queue_pending_title: { en: 'Still pending', hi: 'अभी भी लंबित' },
  queue_pending_body: { en: 'Some items could not be submitted. Check error details.', hi: 'कुछ आइटम सबमिट नहीं हो सके। त्रुटि विवरण देखें।' },
  queue_all_clear_title: { en: 'All clear', hi: 'सब साफ़' },
  queue_all_clear_body: { en: 'Nothing to sync.', hi: 'सिंक करने के लिए कुछ नहीं।' },
  queue_delete_title: { en: 'Delete queued visit?', hi: 'कतारबद्ध भ्रमण हटाएं?' },
  queue_delete_body: { en: 'Discard the saved visit for {name}?', hi: '{name} के लिए सहेजा गया भ्रमण हटाएं?' },
  queue_delete_btn: { en: 'Delete', hi: 'हटाएं' },
  queue_try_one: { en: '1 try', hi: '1 प्रयास' },
  queue_try_many: { en: '{n} tries', hi: '{n} प्रयास' },
  queue_offline_banner: { en: 'You\u2019re offline. Visits are saved locally and will upload automatically.', hi: 'आप ऑफ़लाइन हैं। भ्रमण स्थानीय रूप से सहेजे जा रहे हैं और स्वतः अपलोड होंगे।' },

  // Language switcher
  lang_english: { en: 'English', hi: 'अंग्रेज़ी' },
  lang_hindi: { en: 'हिंदी', hi: 'हिंदी' },
  lang_switch_tooltip: { en: 'Switch language', hi: 'भाषा बदलें' },

  // Bottom tabs
  tab_home: { en: 'Home', hi: 'होम' },
  tab_booths: { en: 'Booths', hi: 'बूथ' },
  tab_explore: { en: 'Explore', hi: 'अन्वेषण' },
  tab_sync: { en: 'Sync', hi: 'सिंक' },

  // Explore (State) screen
  explore_title: { en: 'Explore', hi: 'अन्वेषण' },
  explore_subtitle: { en: 'State → District → Constituency → Booth → Voter', hi: 'राज्य → जिला → विधानसभा → बूथ → मतदाता' },
  explore_load_failed: { en: 'Failed to load overview', hi: 'अवलोकन लोड करने में विफल' },
  explore_state_label: { en: 'STATE', hi: 'राज्य' },
  explore_state_default: { en: 'Uttar Pradesh', hi: 'उत्तर प्रदेश' },
  explore_stat_districts: { en: 'Districts', hi: 'जिले' },
  explore_stat_acs: { en: 'ACs', hi: 'विधानसभा' },
  explore_stat_booths: { en: 'Booths', hi: 'बूथ' },
  explore_outreach_progress: { en: 'Outreach progress', hi: 'पहुँच प्रगति' },
  explore_voters_completed: { en: '{done} of {total} voters completed', hi: '{total} में से {done} मतदाता पूर्ण' },
  explore_all_voters_reached: { en: 'All voters reached', hi: 'सभी मतदाताओं तक पहुँच गए' },
  explore_drill_in: { en: 'Tap to drill into districts', hi: 'जिलों में जाने के लिए टैप करें' },
  explore_how_title: { en: 'How this works', hi: 'यह कैसे काम करता है' },
  explore_green_tick: { en: 'Green tick', hi: 'हरा निशान' },
  explore_green_tick_sub: { en: 'All voters at this level have been reached.', hi: 'इस स्तर के सभी मतदाताओं तक पहुँच गए।' },
  explore_progress_bar: { en: 'Progress bar', hi: 'प्रगति पट्टी' },
  explore_progress_bar_sub: { en: 'Tap in to continue outreach where it\u2019s pending.', hi: 'जहाँ लंबित है वहाँ पहुँच जारी रखने के लिए टैप करें।' },
  explore_complete_upload: { en: 'Complete & upload', hi: 'पूर्ण और अपलोड' },
  explore_complete_upload_sub: { en: 'Log a visit for each voter — offline entries sync automatically.', hi: 'प्रत्येक मतदाता के लिए भ्रमण दर्ज करें — ऑफ़लाइन प्रविष्टियाँ स्वतः सिंक होती हैं।' },

  // Districts screen
  districts_title: { en: 'Districts', hi: 'जिले' },
  districts_load_failed: { en: 'Failed to load districts', hi: 'जिले लोड करने में विफल' },
  districts_search: { en: 'Search district', hi: 'जिला खोजें' },
  districts_subtitle_one: { en: '{state} · 1 district · {pct}% done', hi: '{state} · 1 जिला · {pct}% पूर्ण' },
  districts_subtitle_many: { en: '{state} · {n} districts · {pct}% done', hi: '{state} · {n} जिले · {pct}% पूर्ण' },
  districts_booths_one: { en: '1 booth', hi: '1 बूथ' },
  districts_booths_many: { en: '{n} booths', hi: '{n} बूथ' },
  districts_voters_count: { en: '{n} voters', hi: '{n} मतदाता' },
  districts_reached: { en: 'Reached', hi: 'पूर्ण' },
  districts_continue: { en: 'Continue', hi: 'जारी रखें' },
  districts_empty: { en: 'No districts found', hi: 'कोई जिला नहीं मिला' },
  districts_empty_data: { en: 'No booths are configured yet in this state.', hi: 'इस राज्य में अभी तक कोई बूथ कॉन्फ़िगर नहीं है।' },
  districts_empty_search: { en: 'Try a different search term.', hi: 'एक अलग खोज शब्द आज़माएँ।' },

  // Constituencies screen
  constituencies_title: { en: 'Vidhan Sabha', hi: 'विधानसभा' },
  constituencies_load_failed: { en: 'Failed to load constituencies', hi: 'विधानसभा लोड करने में विफल' },
  constituencies_search: { en: 'Search constituency', hi: 'विधानसभा खोजें' },
  constituencies_subtitle_one: { en: '{district} · 1 constituency · {pct}% done', hi: '{district} · 1 विधानसभा · {pct}% पूर्ण' },
  constituencies_subtitle_many: { en: '{district} · {n} constituencies · {pct}% done', hi: '{district} · {n} विधानसभा · {pct}% पूर्ण' },
  constituencies_view_booths: { en: 'View booths', hi: 'बूथ देखें' },
  constituencies_empty: { en: 'No constituencies found', hi: 'कोई विधानसभा नहीं मिली' },
  constituencies_empty_data: { en: 'No booths mapped to this district yet.', hi: 'इस जिले में अभी तक कोई बूथ मैप नहीं।' },

  // Booths-in-AC screen
  booths_load_failed: { en: 'Failed to load booths', hi: 'बूथ लोड करने में विफल' },
  booths_search: { en: 'Name, part number, or village', hi: 'नाम, भाग संख्या, या गाँव' },
  booths_subtitle_one: { en: '1 booth · {pct}% done', hi: '1 बूथ · {pct}% पूर्ण' },
  booths_subtitle_many: { en: '{n} booths · {pct}% done', hi: '{n} बूथ · {pct}% पूर्ण' },
  booths_part_label: { en: 'PART', hi: 'भाग' },
  booths_all_uploaded: { en: 'All uploaded', hi: 'सब अपलोड' },
  booths_complete_upload: { en: 'Complete & upload', hi: 'पूर्ण और अपलोड' },
  booths_empty: { en: 'No booths found', hi: 'कोई बूथ नहीं मिला' },
  booths_empty_data: { en: 'No booths configured for this constituency yet.', hi: 'इस विधानसभा के लिए अभी तक कोई बूथ नहीं।' },
};

function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, key) =>
    vars[key] !== undefined ? String(vars[key]) : m,
  );
}

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  ready: boolean;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'hi' || saved === 'en') setLangState(saved);
      } catch {
        // fall back to English
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setLangState((prev) => {
      const next: Lang = prev === 'en' ? 'hi' : 'en';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const entry = DICT[key];
      if (!entry) {
        if (__DEV__) console.warn(`[i18n] missing key: ${key}`);
        return key;
      }
      return format(entry[lang] || entry.en, vars);
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, toggle, t, ready }), [lang, setLang, toggle, t, ready]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
