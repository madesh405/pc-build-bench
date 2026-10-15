
import os
import getpass
from pathlib import Path
from datetime import datetime

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait, Select
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
email = ""
password = ""
authenticated = False


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


def heading():
    return driver.find_element(
        By.CSS_SELECTOR, ".topbar h1"
    ).text.strip()


def test_homepage():
    driver.get(BASE_URL)
    wait.until(
        lambda d: d.execute_script(
            "return document.readyState"
        ) == "complete"
    )
    assert "PC Build Bench" in driver.find_element(
        By.TAG_NAME, "body"
    ).text


def test_components_page():
    click_button("Components")
    wait.until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, "input[placeholder='Search parts']")
        )
    )


def test_component_search():
    rows = driver.find_elements(
        By.CSS_SELECTOR,
        ".catalog-table .catalog-row:not(.catalog-head)"
    )
    assert rows, "No components displayed"

    name = rows[0].find_element(
        By.CSS_SELECTOR, ".component-name b"
    ).text.strip()
    assert name, "Component name is empty"

    search = driver.find_element(
        By.CSS_SELECTOR, "input[placeholder='Search parts']"
    )
    search.send_keys(name.split()[0])

    wait.until(
        lambda d: len(d.find_elements(
            By.CSS_SELECTOR,
            ".catalog-table .catalog-row:not(.catalog-head)"
        )) > 0
    )


def test_gpu_filter():
    search = driver.find_element(
        By.CSS_SELECTOR, "input[placeholder='Search parts']"
    )
    search.clear()
    click_button("GPU")

    wait.until(lambda d: len(d.find_elements(
        By.CSS_SELECTOR, ".component-name .tag"
    )) > 0)

    categories = [
        e.text.strip().lower()
        for e in driver.find_elements(
            By.CSS_SELECTOR, ".component-name .tag"
        )
    ]
    assert all(c == "gpu" for c in categories)


def test_case_filter():
    click_button("Case")
    wait.until(lambda d: len(d.find_elements(
        By.CSS_SELECTOR, ".component-name .tag"
    )) > 0)

    categories = [
        e.text.strip().lower()
        for e in driver.find_elements(
            By.CSS_SELECTOR, ".component-name .tag"
        )
    ]
    assert all(c == "case" for c in categories)


def test_build_configuration():
    click_button("Build Configuration")
    wait.until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, ".builder-layout")
        )
    )


def test_select_components():
    for index in range(7):
        # Re-find each select after React updates the page.
        selects = driver.find_elements(
            By.CSS_SELECTOR, ".builder-layout select"
        )
        assert len(selects) >= 7, (
            f"Expected 7 component selectors; found {len(selects)}"
        )

        selector = Select(selects[index])
        assert len(selector.options) > 1, (
            f"Selector {index + 1} has no components"
        )
        selector.select_by_index(1)

    selects = driver.find_elements(
        By.CSS_SELECTOR, ".builder-layout select"
    )
    assert all(
        Select(s).first_selected_option.get_attribute("value")
        for s in selects[:7]
    ), "At least one component was not selected"

    wait.until(
        EC.presence_of_element_located(
            (By.CSS_SELECTOR, ".summary-line")
        )
    )
    assert driver.find_elements(
        By.CSS_SELECTOR, ".analysis-list .analysis-row"
    ), "Build analysis checks are missing"


def test_login_and_compatibility():
    global authenticated

    click_button("Compatibility & Analysis")

    modal = wait.until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, ".login-modal")
        )
    )

    email_box = modal.find_element(
        By.CSS_SELECTOR, "input[type='email']"
    )
    password_box = modal.find_element(
        By.CSS_SELECTOR, "input[type='password']"
    )

    email_box.send_keys(email)
    password_box.send_keys(password)
    modal.find_element(
        By.CSS_SELECTOR, "button[type='submit']"
    ).click()

    try:
        wait.until(
            EC.invisibility_of_element_located(
                (By.CSS_SELECTOR, ".login-modal")
            )
        )
    except Exception:
        errors = driver.find_elements(
            By.CSS_SELECTOR, ".login-modal .auth-error"
        )
        message = errors[0].text if errors else (
            "Login did not complete; inspect the website."
        )
        raise AssertionError(message)

    wait.until(
        lambda d: heading() == "Compatibility & Analysis"
    )
    authenticated = True


def test_compatibility_and_power():
    assert authenticated, "Login did not succeed"

    wait.until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, ".analysis-list.detailed")
        )
    )

    body = driver.find_element(By.TAG_NAME, "body").text
    assert "Required PSU" in body, "PSU metric not displayed"
    assert "Estimated power" in body, (
        "Estimated power metric not displayed"
    )

    rows = driver.find_elements(
        By.CSS_SELECTOR, ".analysis-list.detailed .analysis-row"
    )
    assert rows, "Compatibility checks are missing"


def test_workload_evaluation():
    click_button("Workload Evaluation")

    wait.until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, ".work-list .work-row")
        )
    )

    row = driver.find_elements(
        By.CSS_SELECTOR, ".work-list .work-row"
    )[0]

    if "selected" not in row.get_attribute("class").split():
        row.click()

    wait.until(
        lambda d: "selected" in d.find_elements(
            By.CSS_SELECTOR, ".work-list .work-row"
        )[0].get_attribute("class").split()
    )


def test_qfd_analysis():
    click_button("QFD Analysis")

    wait.until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, ".matrix")
        )
    )

    assert driver.find_elements(
        By.CSS_SELECTOR, ".range-row input[type='range']"
    ), "QFD importance controls are missing"

    assert driver.find_elements(
        By.CSS_SELECTOR, ".priority-list"
    ), "QFD technical priorities are missing"



def test_fmea():
    click_button("FMEA Risk Analysis")

    wait.until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, ".table-wrap table")
        )
    )

    headers = [
        " ".join(th.text.split()).casefold()
        for th in driver.find_elements(
            By.CSS_SELECTOR, ".table-wrap table thead th"
        )
    ]

    assert any("rpn" in h for h in headers), (
        f"FMEA RPN column is missing. Headers found: {headers}"
    )

    assert any(
        "failure" in h and "mode" in h for h in headers
    ), f"FMEA failure-mode column is missing. Headers found: {headers}"



def test_recommendations():
    click_button("Recommendations")

    wait.until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, ".recommend-list")
        )
    )

    assert heading() == "Recommendations"


def test_admin_access():
    click_button("Administration")

    wait.until(lambda d: heading() == "Administration")

    assert "Administration" in driver.find_element(
        By.TAG_NAME, "body"
    ).text


def main():
    global driver, wait, email, password

    print("PC BUILD BENCH - SELENIUM FUNCTIONAL TESTS")
    print(f"Website: {BASE_URL}\n")

    email = os.getenv("PCBB_EMAIL") or input(
        "Account email: "
    ).strip()
    password = os.getenv("PCBB_PASSWORD") or getpass.getpass(
        "Account password (hidden): "
    )

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
            ("Component selection works", test_select_components),
            ("Login and compatibility access", test_login_and_compatibility),
            ("Compatibility and power analysis", test_compatibility_and_power),
            ("Workload evaluation works", test_workload_evaluation),
            ("QFD analysis works", test_qfd_analysis),
            ("FMEA risk analysis opens", test_fmea),
            ("Recommendations page opens", test_recommendations),
            ("Admin access works", test_admin_access),
        ]

        for name, action in tests:
            record(name, action)

    except Exception as exc:
        print(f"Browser startup error: {exc}")

    finally:
        if driver:
            driver.quit()

        passed = sum(s == "PASS" for _, s, _ in results)
        failed = sum(s == "FAIL" for _, s, _ in results)
        report = RESULT_DIR / "report.txt"

        with report.open("w", encoding="utf-8") as file:
            file.write("PC BUILD BENCH - SELENIUM TEST REPORT\n")
            file.write(f"Date: {datetime.now().isoformat(timespec='seconds')}\n")
            file.write(f"Website: {BASE_URL}\n\n")

            for name, status, reason in results:
                file.write(f"{status}: {name}\n")
                if reason:
                    file.write(f"  Reason: {reason}\n")

            file.write(f"\nPassed: {passed}\nFailed: {failed}\n")
            file.write(f"Total: {len(results)}\n")

        print(f"\nPASSED: {passed} | FAILED: {failed}")
        print(f"Report saved to: {report}")


if __name__ == "__main__":
    main()
