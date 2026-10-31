import requests
import json

# تنظیمات شبیه‌سازی شده
def send_crash_payload(phone_number, payload_text):
    """
    این تابع به صورت نمادین یک پیام کرش‌ساز را به شماره واتساپ ارسال می‌کند.
    در واقعیت، باید از API واتساپ (مثل WhatsApp Business API) استفاده کنید.
    """
    
    # نمونه پیلود: کاراکترهای Unicode خاص که ممکن است باگ ایجاد کنند
    crash_payload = payload_text
    
    url = "https://api.whatsapp.com/send"  # URL نمادین
    params = {
        'phone': phone_number,
        'text': crash_payload
    }
    
    try:
        response = requests.post(url, params=params)
        if response.status_code == 200:
            return f"پیام کرش‌ساز به {phone_number} ارسال شد."
        else:
            return f"خطا در ارسال: {response.status_code}"
    except Exception as e:
        return str(e)

# مثال استفاده:
phone = "989123456789"  # شماره مقصد (بدون +)
crash_msg = "🔥💥🦠"  # ایموجی‌های خاص یا کاراکترهای غیرمجاز

print(send_crash_payload(phone, crash_msg))