namespace SocialBackEnd.Common.DTOs.Ai;

public sealed record FormatResponse
{
    public sealed record FormatResponseValidate
    {
        public string Result { set; get; }

        public string Explain { set; get; } = string.Empty;
    }
}
