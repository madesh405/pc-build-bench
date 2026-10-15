
import os
from pathlib import Path
from datetime import datetime

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = os.getenv(
    "PCBB_URL",
    "https://madesh405.github.io/pc-build-bench/"
)

RESULT_DIR = Path(__file__).parent / "results"
RESULT_DIR.mkdir(exist_ok=True)

results = []
driver = None
wait = None


def record(name, action):
    try:
        action()
        results.append((name, "PASS", ""))
        print(f"[PASS] {name}")
    except Exception as exc:
        reason = f"{type(exc).__name__}: {exc}"
        results.append((name, "FAIL", reason))
        print(f"[FAIL] {name}: {reason}")

        if driver:
            try:
                filename = name.lower().replace(" ", "_")
                driver.save_screenshot(
                    str(RESULT_DIR / f"{filename}.png")
                )
            except Exception:
                pass


def click_button(label):
    xpath = (
        f"//button[normalize-space(.)='{label}' "
        f"or .//span[normalize-space()='{label}']]"
    )
    wait.until(
        EC.element_to_be_clickable((By.XPATH, xpath))
    ).click()


def body_text():
    return driver.find_element(By.TAG_NAME, "body").text


def component_rows():
    return driver.find_elements(
        By.CSS_SELECTOR,
        ".catalog-table .catalog-row:not(.catalog-head)"
    )


def close_login_modal():
    wait.until(
        EC.element_to_be_clickable(
            (By.CSS_SELECTOR, ".login-modal .modal-close")
        )
    ).click()

    wait.until(
        EC.invisibility_of_element_located(
            (By.CSS_SELECTOR, ".login-modal")
        )
    )


def test_homepage():
    driver.get(BASE_URL)

    wait.until(
        lambda d: d.execute_script(
            "return document.readyState"
        ) == "complete"
    )

    assert "PC Build Bench" in body_text()


def test_components_page():
    click_button("Components")

    wait.until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, "input[placeholder='Search parts']")
        )
    )


def test_component_search():
    rows = component_rows()
    assert rows, "No component rows displayed"

    first_name = rows[0].find_element(
        By.CSS_SELECTOR, ".component-name b"
    ).text.strip()

    assert first_name, "First component has no name"

    search = driver.find_element(
        By.CSS_SELECTOR, "input[placeholder='Search parts']"
    )
    search.send_keys(first_name.split()[0])

    wait.until(lambda d: len(component_rows()) > 0)


def test_gpu_filter():
    search = driver.find_element(
        By.CSS_SELECTOR, "input[placeholder='Search parts']"
    )
    search.clear()
    click_button("GPU")

    wait.until(lambda d: len(component_rows()) > 0)

    categories = [
        el.text.strip().lower()
        for el in driver.find_elements(
            By.CSS_SELECTOR, ".component-name .tag"
        )
    ]

    assert categories, "No GPU results found"
    assert all(x == "gpu" for x in categories), (
        "GPU filter displayed another category"
    )


def test_case_filter():
    click_button("Case")
    wait.until(lambda d: len(component_rows()) > 0)

    categories = [
        el.text.strip().lower()
        for el in driver.find_elements(
            By.CSS_SELECTOR, ".component-name .tag"
        )
    ]

    assert categories, "No case results found"
    assert all(x == "case" for x in categories), (
        "Case filter displayed another category"
    )


def test_build_configuration():
    click_button("Build Configuration")

    wait.until(
        EC.presence_of_element_located(
            (By.CSS_SELECTOR, ".builder-layout")
        )
    )

    selects = driver.find_elements(
        By.CSS_SELECTOR, ".builder-layout select"
    )

    assert len(selects) >= 7, (
        f"Expected 7 component selectors, found {len(selects)}"
    )


def test_compatibility_access_control():
    click_button("Compatibility & Analysis")

    modal = wait.until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, ".login-modal")
        )
    )

    heading = modal.find_element(By.TAG_NAME, "h2").text

    assert heading == "Sign in to Compatibility & Analysis", (
        f"Unexpected login heading: {heading}"
    )

    close_login_modal()


def test_recommendations_access_control():
    click_button("Recommendations")

    modal = wait.until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, ".login-modal")
        )
    )

    heading = modal.find_element(By.TAG_NAME, "h2").text

    assert heading == "Sign in to Recommendations", (
        f"Unexpected login heading: {heading}"
    )

    close_login_modal()


def main():
    global driver, wait

    print("=" * 55)
    print("PC BUILD BENCH - SELENIUM FUNCTIONAL TESTS")
    print("=" * 55)
    print(f"Website: {BASE_URL}\n")

    try:
        options = webdriver.ChromeOptions()
        options.add_argument("--start-maximized")

        driver = webdriver.Chrome(options=options)
        wait = WebDriverWait(driver, 20)
        driver.set_page_load_timeout(45)

        tests = [
            ("Homepage loads", test_homepage),
            ("Components page opens", test_components_page),
            ("Component search works", test_component_search),
            ("GPU filter works", test_gpu_filter),
            ("Case filter works", test_case_filter),
            ("Build configuration opens", test_build_configuration),
            (
                "Compatibility access control",
                test_compatibility_access_control
            ),
            (
                "Recommendations access control",
                test_recommendations_access_control
            ),
        ]

        for name, action in tests:
            record(name, action)

    except Exception as exc:
        print(f"\nBrowser startup error: {exc}")

    finally:
        if driver:
            driver.quit()

        passed = sum(status == "PASS" for _, status, _ in results)
        failed = sum(status == "FAIL" for _, status, _ in results)

        report = RESULT_DIR / "report.txt"

        with report.open("w", encoding="utf-8") as file:
            file.write("PC BUILD BENCH - SELENIUM TEST REPORT\n")
            file.write(
                f"Date: {datetime.now().isoformat(timespec='seconds')}\n"
            )
            file.write(f"Website: {BASE_URL}\n\n")

            for name, status, reason in results:
                file.write(f"{status}: {name}\n")
                if reason:
                    file.write(f"  Reason: {reason}\n")

            file.write(f"\nPassed: {passed}\n")
            file.write(f"Failed: {failed}\n")
            file.write(f"Total: {len(results)}\n")

        print("\n" + "=" * 55)
        print(f"PASSED: {passed} | FAILED: {failed}")
        print(f"Report: {report}")
        print("=" * 55)


if __name__ == "__main__":
    main()
