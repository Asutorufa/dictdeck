import { ROUTE_HOME, TOKEN_KEY } from "@/lib/constants";
import { EASE_SILK, SPRING_SNAPPY } from "@/lib/motion";
import { addToast } from "@/components";
import { Flex, Text, TextField } from "@radix-ui/themes";
import { motion } from "motion/react";
import { useState } from "react";
import { useLocation } from "wouter";

type LoginResponse = { token: string };

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      addToast({
        title: "Missing username or password",
        description: "Please enter both fields to continue.",
        color: "warning",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = (await res.json()) as LoginResponse;
        if (
          data &&
          typeof data === "object" &&
          "token" in data &&
          typeof data.token === "string"
        ) {
          localStorage.setItem(TOKEN_KEY, data.token);
          setLocation(ROUTE_HOME);
          addToast({
            title: "Login Successful",
            color: "success",
          });
        } else {
          throw new Error("Invalid response format");
        }
      } else {
        const text = await res.text();
        addToast({
          title: "Login Failed",
          description: text,
          color: "danger",
        });
      }
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      addToast({
        title: "Login Error",
        description: errorMessage,
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-login-page">
      <motion.div
        className="app-login-card"
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.36, ease: EASE_SILK }}
      >
        <div className="app-login-brand">
          <motion.img
            src="/dictdeck.svg"
            alt=""
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.84 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...SPRING_SNAPPY, delay: 0.08 }}
          />
          <div>
            <h1>Welcome back</h1>
            <p>Sign in to your DictDeck workspace</p>
          </div>
        </div>

        <Flex direction="column" gap="3">
          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium">
              Username
            </Text>
            <TextField.Root
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleLogin()}
              placeholder="Enter username"
              size="3"
              variant="surface"
            />
          </Flex>
          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium">
              Password
            </Text>
            <TextField.Root
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleLogin()}
              placeholder="Enter password"
              size="3"
              variant="surface"
            />
          </Flex>
          <button
            type="button"
            className="app-primary-action mt-2 w-full"
            disabled={loading}
            onClick={() => void handleLogin()}
          >
            {loading ? <span className="app-loading-dot" /> : "Sign in"}
          </button>
        </Flex>
      </motion.div>
    </div>
  );
}
