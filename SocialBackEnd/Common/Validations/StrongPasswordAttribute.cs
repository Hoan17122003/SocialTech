using System;
using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace SocialBackEnd.Common.Validations;

public class StrongPasswordAttribute : ValidationAttribute
{

    public int MinimumLength { get; set; } = 12;

    public override bool IsValid(object value)
    {
        if (value == null) return false;
        string password = value.ToString();

        if (password.Length < MinimumLength)
        {
            ErrorMessage = $"Password must be at least {MinimumLength} characters long.";
            return false;
        }
        if (!Regex.IsMatch(password, @"[A-Z]"))
        {
            ErrorMessage = "Password must contain at least one uppercase letter.";
            return false;
        }
        if (!Regex.IsMatch(password, @"[a-z]"))
        {
            ErrorMessage = "Password must contain at least one lowercase letter.";
            return false;
        }
        if (!Regex.IsMatch(password, @"\d"))
        {
            ErrorMessage = "Password must contain at least one digit.";
            return false;
        }
        if (!Regex.IsMatch(password, @"[\W_]"))
        {
            ErrorMessage = "Password must contain at least one special character.";
            return false;
        }
        return true;
    }

}
