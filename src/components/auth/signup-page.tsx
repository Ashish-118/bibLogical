"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BookOpen, Mail, User, Shield, CheckCircle, Eye, EyeOff, Clock } from "lucide-react"

export default function SignupPage() {
    const [step, setStep] = useState<"initial" | "verification">("initial")
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        verificationCode: "",
    })
    const [errors, setErrors] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        verificationCode: "",
    })
    const [isLoading, setIsLoading] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [resendTimer, setResendTimer] = useState(0)
    const [canResend, setCanResend] = useState(false)

    useEffect(() => {
        if (step === "verification") {
            // Focus the first input box when verification step appears
            setTimeout(() => {
                const firstInput = document.getElementById("code-0")
                firstInput?.focus()
            }, 300)
        }
    }, [step])

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
    }

    const validateUsername = (username: string) => {
        return username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username)
    }

    const validatePassword = (password: string) => {
        return password.length >= 8 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
    }

    const getPasswordStrength = (password: string) => {
        let strength = 0
        if (password.length >= 8) strength++
        if (/[a-z]/.test(password)) strength++
        if (/[A-Z]/.test(password)) strength++
        if (/\d/.test(password)) strength++
        if (/[^a-zA-Z\d]/.test(password)) strength++
        return strength
    }

    useEffect(() => {
        if (step === "verification" && resendTimer > 0) {
            const timer = setTimeout(() => {
                setResendTimer(resendTimer - 1)
            }, 1000)
            return () => clearTimeout(timer)
        } else if (step === "verification" && resendTimer === 0) {
            setCanResend(true)
        }
    }, [step, resendTimer])

    useEffect(() => {
        if (step === "verification") {
            setResendTimer(60) // 60 second countdown
            setCanResend(false)
            // Focus the first input box when verification step appears
            setTimeout(() => {
                const firstInput = document.getElementById("code-0")
                firstInput?.focus()
            }, 300)
        }
    }, [step])

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }))

        // Clear error when user starts typing
        if (errors[field as keyof typeof errors]) {
            setErrors((prev) => ({ ...prev, [field]: "" }))
        }
    }

    const handleVerify = async () => {
        const newErrors = {
            username: "",
            email: "",
            password: "",
            confirmPassword: "",
            verificationCode: "",
        }

        // Validate username
        if (!formData.username) {
            newErrors.username = "Username is required"
        } else if (!validateUsername(formData.username)) {
            newErrors.username = "Username must be at least 3 characters and contain only letters, numbers, and underscores"
        }

        // Validate email
        if (!formData.email) {
            newErrors.email = "Email is required"
        } else if (!validateEmail(formData.email)) {
            newErrors.email = "Please enter a valid email address"
        }

        // Validate password
        if (!formData.password) {
            newErrors.password = "Password is required"
        } else if (!validatePassword(formData.password)) {
            newErrors.password = "Password must be at least 8 characters with uppercase, lowercase, and number"
        }

        // Validate confirm password
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = "Please confirm your password"
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match"
        }

        setErrors(newErrors)

        if (newErrors.username || newErrors.email || newErrors.password || newErrors.confirmPassword) {
            return
        }

        setIsLoading(true)

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500))

        setIsLoading(false)
        setStep("verification")
    }

    const handleLetsGo = async () => {
        if (!formData.verificationCode) {
            setErrors((prev) => ({ ...prev, verificationCode: "Verification code is required" }))
            return
        }

        if (formData.verificationCode.length !== 6) {
            setErrors((prev) => ({ ...prev, verificationCode: "Please enter a 6-digit code" }))
            return
        }

        setIsVerifying(true)

        // Simulate verification
        await new Promise((resolve) => setTimeout(resolve, 2000))

        setIsVerifying(false)

        // Here you would typically redirect to the main app
        alert("Welcome to BibLogical! Account created successfully.")
    }

    const handleResendCode = async () => {
        setCanResend(false)
        setResendTimer(60)

        // Simulate API call to resend code
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Show success message (you could use a toast here)
        alert("Verification code sent successfully!")
    }

    const handleCodeInput = (value: string) => {
        // Only allow numbers and limit to 6 digits
        const numericValue = value.replace(/\D/g, "").slice(0, 6)
        handleInputChange("verificationCode", numericValue)

        // Focus the appropriate input box
        if (numericValue.length < 6) {
            const nextInput = document.getElementById(`code-${numericValue.length}`)
            nextInput?.focus()
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-600 rounded-full mb-4">
                        <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">BibLogical</h1>
                    <p className="text-gray-600">Join the ultimate Bible gaming experience</p>
                </div>

                <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-amber-600 to-amber-400"></div>
                    <CardHeader className="text-center pb-4">
                        <div className="mb-2">
                            {step === "initial" ? (
                                <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center animate-in fade-in duration-500">
                                    <User className="w-6 h-6 text-amber-600" />
                                </div>
                            ) : (
                                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center animate-in fade-in duration-500">
                                    <Mail className="w-6 h-6 text-green-600" />
                                </div>
                            )}
                        </div>
                        <CardTitle className="text-2xl font-semibold text-gray-800">
                            {step === "initial" ? "Create Account" : "Verify Your Email"}
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                            {step === "initial"
                                ? "Start your spiritual gaming journey today"
                                : `We've sent a 6-digit code to ${formData.email}`}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {step === "initial" ? (
                            <div className="space-y-4">
                                {/* Username Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                                        Username
                                    </Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            id="username"
                                            type="text"
                                            placeholder="Enter your username"
                                            value={formData.username}
                                            onChange={(e) => handleInputChange("username", e.target.value)}
                                            className={`pl-10 transition-all duration-200 ${errors.username
                                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                                : "border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                                                }`}
                                        />
                                    </div>
                                    {errors.username && (
                                        <Alert className="border-red-200 bg-red-50 animate-in slide-in-from-top-1 duration-200">
                                            <AlertDescription className="text-red-700 text-sm">{errors.username}</AlertDescription>
                                        </Alert>
                                    )}
                                </div>

                                {/* Email Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                                        Email Address
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="Enter your email"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange("email", e.target.value)}
                                            className={`pl-10 transition-all duration-200 ${errors.email
                                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                                : "border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                                                }`}
                                        />
                                    </div>
                                    {errors.email && (
                                        <Alert className="border-red-200 bg-red-50 animate-in slide-in-from-top-1 duration-200">
                                            <AlertDescription className="text-red-700 text-sm">{errors.email}</AlertDescription>
                                        </Alert>
                                    )}
                                </div>

                                {/* Password Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                                        Password
                                    </Label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter your password"
                                            value={formData.password}
                                            onChange={(e) => handleInputChange("password", e.target.value)}
                                            className={`pl-10 pr-10 transition-all duration-200 ${errors.password
                                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                                : "border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                                                }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {formData.password && (
                                        <div className="space-y-1">
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map((level) => (
                                                    <div
                                                        key={level}
                                                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${getPasswordStrength(formData.password) >= level
                                                            ? level <= 2
                                                                ? "bg-red-500"
                                                                : level <= 3
                                                                    ? "bg-yellow-500"
                                                                    : level <= 4
                                                                        ? "bg-blue-500"
                                                                        : "bg-green-500"
                                                            : "bg-gray-200"
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-600">
                                                Password strength:{" "}
                                                {getPasswordStrength(formData.password) <= 2
                                                    ? "Weak"
                                                    : getPasswordStrength(formData.password) <= 3
                                                        ? "Fair"
                                                        : getPasswordStrength(formData.password) <= 4
                                                            ? "Good"
                                                            : "Strong"}
                                            </p>
                                        </div>
                                    )}
                                    {errors.password && (
                                        <Alert className="border-red-200 bg-red-50 animate-in slide-in-from-top-1 duration-200">
                                            <AlertDescription className="text-red-700 text-sm">{errors.password}</AlertDescription>
                                        </Alert>
                                    )}
                                </div>

                                {/* Confirm Password Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                                        Confirm Password
                                    </Label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Confirm your password"
                                            value={formData.confirmPassword}
                                            onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                                            className={`pl-10 pr-10 transition-all duration-200 ${errors.confirmPassword
                                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                                : formData.confirmPassword && formData.password === formData.confirmPassword
                                                    ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                                                    : "border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                                                }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {formData.confirmPassword && formData.password === formData.confirmPassword && (
                                        <div className="flex items-center text-green-600 text-sm">
                                            <CheckCircle className="w-4 h-4 mr-1" />
                                            Passwords match
                                        </div>
                                    )}
                                    {errors.confirmPassword && (
                                        <Alert className="border-red-200 bg-red-50 animate-in slide-in-from-top-1 duration-200">
                                            <AlertDescription className="text-red-700 text-sm">{errors.confirmPassword}</AlertDescription>
                                        </Alert>
                                    )}
                                </div>

                                <Button
                                    onClick={handleVerify}
                                    disabled={isLoading}
                                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2.5 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
                                >
                                    {isLoading ? (
                                        <div className="flex items-center justify-center">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                            Sending Code...
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center">
                                            <Shield className="w-4 h-4 mr-2" />
                                            Verify
                                        </div>
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                {/* Verification Code Field */}
                                <div className="space-y-4">
                                    <Label htmlFor="verificationCode" className="text-sm font-medium text-gray-700 block text-center">
                                        Verification Code
                                    </Label>
                                    <div className="flex justify-center gap-2">
                                        {[0, 1, 2, 3, 4, 5].map((index) => (
                                            <div key={index} className="relative">
                                                <input
                                                    type="text"
                                                    maxLength={1}
                                                    value={formData.verificationCode[index] || ""}
                                                    onChange={(e) => {
                                                        const value = e.target.value
                                                        if (value && /^[0-9]$/.test(value)) {
                                                            const newCode = formData.verificationCode.split("")
                                                            newCode[index] = value
                                                            handleInputChange("verificationCode", newCode.join(""))

                                                            // Auto-focus next input
                                                            if (index < 5 && value) {
                                                                const nextInput = document.getElementById(`code-${index + 1}`)
                                                                nextInput?.focus()
                                                            }
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        // Handle backspace
                                                        if (e.key === "Backspace") {
                                                            if (!formData.verificationCode[index] && index > 0) {
                                                                const prevInput = document.getElementById(`code-${index - 1}`)
                                                                prevInput?.focus()
                                                            }
                                                        }
                                                    }}
                                                    onPaste={(e) => {
                                                        e.preventDefault()
                                                        const pastedData = e.clipboardData.getData("text/plain").replace(/\D/g, "").slice(0, 6)
                                                        handleInputChange("verificationCode", pastedData)
                                                    }}
                                                    id={`code-${index}`}
                                                    className={`w-12 h-14 text-center text-xl font-mono border rounded-md transition-all duration-300 
                            ${formData.verificationCode[index] ? "border-amber-500 bg-amber-50 scale-110" : "border-gray-300"} 
                            ${errors.verificationCode ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "focus:border-amber-500 focus:ring-amber-500"}
                            focus:outline-none focus:ring-2 focus:ring-opacity-50`}
                                                />
                                                {index < 5 && (
                                                    <div
                                                        className={`absolute -right-2 top-1/2 transform -translate-y-1/2 w-2 flex justify-center pointer-events-none ${formData.verificationCode[index] ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
                                                    >
                                                        <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {errors.verificationCode && (
                                        <Alert className="border-red-200 bg-red-50 animate-in slide-in-from-top-1 duration-200">
                                            <AlertDescription className="text-red-700 text-sm text-center">
                                                {errors.verificationCode}
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>

                                {/* Resend Code Section */}
                                <div className="text-center space-y-2">
                                    <p className="text-sm text-gray-600">Didn't receive the code?</p>
                                    {canResend ? (
                                        <Button
                                            variant="ghost"
                                            onClick={handleResendCode}
                                            className="text-amber-600 hover:text-amber-700 font-medium transition-colors duration-200"
                                        >
                                            Resend Code
                                        </Button>
                                    ) : (
                                        <div className="flex items-center justify-center text-sm text-gray-500">
                                            <Clock className="w-4 h-4 mr-1" />
                                            Resend in {resendTimer}s
                                        </div>
                                    )}
                                </div>

                                <Button
                                    onClick={handleLetsGo}
                                    disabled={isVerifying || formData.verificationCode.length !== 6}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
                                >
                                    {isVerifying ? (
                                        <div className="flex items-center justify-center">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                            Verifying...
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center">
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Let's Go!
                                        </div>
                                    )}
                                </Button>

                                <Button
                                    variant="ghost"
                                    onClick={() => setStep("initial")}
                                    className="w-full text-gray-600 hover:text-gray-800 transition-colors duration-200"
                                >
                                    ← Back to edit details
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="text-center mt-6 text-sm text-gray-600">
                    Already have an account?{" "}
                    <button className="text-amber-600 hover:text-amber-700 font-medium transition-colors duration-200">
                        Sign In
                    </button>
                </div>
            </div>
        </div>
    )
}
