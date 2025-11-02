# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - button "Switch to Arabic" [ref=e3] [cursor=pointer]:
      - img [ref=e4]
    - generic [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e9]: ST
        - heading "Selective Trading" [level=1] [ref=e10]
        - paragraph [ref=e11]: Welcome Back
      - generic [ref=e12]:
        - heading "Login" [level=2] [ref=e13]
        - generic [ref=e14]:
          - generic [ref=e15]:
            - generic [ref=e16]: Phone Number
            - generic [ref=e17]:
              - img [ref=e18]
              - textbox "Enter your phone number" [ref=e20]
          - button "Continue" [ref=e21] [cursor=pointer]
        - paragraph [ref=e23]:
          - text: Don't have an account?
          - link "Sign Up" [ref=e24]:
            - /url: /signup
      - link "Back to Home" [ref=e26]:
        - /url: /
        - img [ref=e27]
        - text: Back to Home
  - alert [ref=e29]
```